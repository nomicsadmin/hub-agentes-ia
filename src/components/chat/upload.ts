import { UPLOAD_LIMITS, type UploadResult } from "@/lib/chat/contract"
import { createClient } from "@/lib/supabase/client"
import { withBase } from "@/lib/base-path"

/* Envio de anexos para POST /api/uploads (contrato em src/lib/chat/contract.ts). */

export type UploadKind = UploadResult["kind"]

/* Resposta de erro das rotas: { error } em português; senão, a mensagem padrão. */
export async function readError(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { error?: unknown; message?: unknown }
    const msg = typeof data.error === "string" ? data.error : typeof data.message === "string" ? data.message : null
    return msg || fallback
  } catch {
    return fallback
  }
}

/*
 * Envio: o arquivo sobe direto do navegador para o Storage
 * (chat-uploads/{user_id}/{uuid}-{nome}; o RLS só deixa gravar na
 * pasta do dono) e depois é registrado em POST /api/uploads (JSON).
 * Assim não esbarra no limite de ~4,5 MB do corpo na Vercel.
 */
export async function uploadFile(
  file: File,
  kind: UploadKind,
  opts: { userId: string; durationSeconds?: number }
): Promise<UploadResult> {
  const path = `${opts.userId}/${crypto.randomUUID()}-${safeName(file.name, kind)}`
  const contentType = (file.type || (kind === "pdf" ? "application/pdf" : "")).split(";")[0]

  const supabase = createClient()
  const { error: storageError } = await supabase.storage
    .from("chat-uploads")
    .upload(path, file, { contentType: contentType || undefined, upsert: false })
  if (storageError) {
    const tooBig = /size|large|payload/i.test(storageError.message)
    throw new Error(tooBig ? "Arquivo grande demais." : "Não foi possível enviar o arquivo. Tente de novo.")
  }

  let res: Response
  try {
    res = await fetch(withBase("/api/uploads"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        storagePath: path,
        title: kind === "audio" ? "Áudio" : file.name,
        ...(opts.durationSeconds !== undefined ? { durationSeconds: Math.round(opts.durationSeconds) } : {}),
      }),
    })
  } catch {
    throw new Error("Sem conexão. Confira a internet e tente de novo.")
  }
  if (!res.ok) {
    const fallback =
      res.status === 413
        ? "Arquivo grande demais."
        : res.status === 429
          ? "Você chegou ao limite de envios de hoje."
          : kind === "audio"
            ? "Não foi possível enviar o áudio."
            : "Não foi possível enviar o arquivo."
    throw new Error(await readError(res, fallback))
  }
  return (await res.json()) as UploadResult
}

/* Nome seguro para o Storage (sem acento, sem barra). */
function safeName(name: string, kind: UploadKind) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+/, "")
  return (base || (kind === "pdf" ? "documento.pdf" : kind === "audio" ? "audio" : "imagem")).slice(-80)
}

const HEIC_RE = /\.(heic|heif)$/i

/* Tipo do anexo pelo arquivo escolhido; null = não aceito. */
export function kindOf(file: File): "image" | "pdf" | null {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return "pdf"
  if ((UPLOAD_LIMITS.imageTypes as readonly string[]).includes(file.type) || HEIC_RE.test(file.name)) return "image"
  return null
}

/* Mensagem de erro se o arquivo não pode ir; null se pode. */
export function validateFile(file: File): string | null {
  const kind = kindOf(file)
  if (!kind) return `"${file.name}" não é aceito. Envie PDF, JPG, PNG, WEBP ou HEIC.`
  const max = kind === "pdf" ? UPLOAD_LIMITS.pdfBytes : UPLOAD_LIMITS.imageBytes
  if (file.size > max) return `"${file.name}" passa de ${Math.round(max / 1024 / 1024)} MB.`
  return null
}

export const ACCEPT_FILES = ["application/pdf", ".pdf", ...UPLOAD_LIMITS.imageTypes, ".heic", ".heif"].join(",")
export const ACCEPT_IMAGES = [...UPLOAD_LIMITS.imageTypes, ".heic", ".heif"].join(",")

export function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`
  return `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`
}

/*
 * Formato de gravação que o navegador suporta. Chrome/Android: webm com
 * opus; Safari/iOS: mp4 (aac). A OpenAI transcreve os dois.
 */
export function pickAudioMime() {
  if (typeof MediaRecorder === "undefined") return null
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/ogg;codecs=opus"]
  for (const m of options) {
    if (MediaRecorder.isTypeSupported?.(m)) return m
  }
  return ""
}

export function audioExtension(mime: string) {
  if (mime.includes("mp4") || mime.includes("aac")) return "m4a"
  if (mime.includes("ogg")) return "ogg"
  return "webm"
}

export const isHeic = (file: File) => /image\/hei[cf]/i.test(file.type) || HEIC_RE.test(file.name)

/*
 * A OpenAI não lê HEIC: converte para JPEG no navegador (o Safari
 * decodifica HEIC; o Chrome não). Devolve null se não der.
 */
export async function heicToJpeg(file: File): Promise<File | null> {
  try {
    let source: ImageBitmap | HTMLImageElement
    try {
      source = await createImageBitmap(file)
    } catch {
      const url = URL.createObjectURL(file)
      try {
        source = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = reject
          img.src = url
        })
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    const w = "naturalWidth" in source ? source.naturalWidth : source.width
    const h = "naturalHeight" in source ? source.naturalHeight : source.height
    if (!w || !h) return null
    const scale = Math.min(1, 4096 / Math.max(w, h))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88))
    if (!blob) return null
    return new File([blob], file.name.replace(HEIC_RE, "") + ".jpg", { type: "image/jpeg" })
  } catch {
    return null
  }
}
