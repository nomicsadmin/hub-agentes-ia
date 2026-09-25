import { randomUUID } from "node:crypto"
import { z } from "zod"
import { toFile } from "openai"
import { getActiveUser } from "@/lib/auth/session"
import { createAdminClient, createClient } from "@/lib/supabase/server"
import { serverEnv } from "@/lib/env.server"
import { UPLOAD_LIMITS, type UploadResult } from "@/lib/chat/contract"
import { getOpenAI, logAIError, MISSING_KEY_MESSAGE } from "@/lib/ai/openai"
import { checkDailyLimit, recordUsage } from "@/lib/ai/limits"

/*
 * POST /api/uploads
 *
 * Modo 1 (contrato): multipart/form-data com file, kind ("audio" | "image" | "pdf")
 *   e, opcional no áudio, durationSeconds (<= 300). O servidor salva em
 *   chat-uploads/{user_id}/{uuid}-{nome}.
 *
 * Modo 2 (arquivos grandes): na Vercel o corpo de uma função vai só até
 *   ~4,5 MB. Para PDF/imagem maiores, o navegador sobe direto para o
 *   Storage (o RLS só deixa gravar em chat-uploads/{user_id}/...) e chama
 *   esta rota com JSON { kind, storagePath, title } para registrar.
 *
 * Nos dois modos: valida tipo e tamanho (UPLOAD_LIMITS), limite diário,
 * cria message_attachments sem message_id (o /api/chat faz o vínculo) e,
 * no áudio, transcreve antes de responder. Resposta: UploadResult ou { error }.
 */

export const runtime = "nodejs"
export const maxDuration = 120

/* Formatos de áudio aceitos pela transcrição da OpenAI → extensão do arquivo. */
const AUDIO_TYPES: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/flac": "flac",
  "video/webm": "webm",
  "video/mp4": "mp4",
}
// 5 min de áudio do celular ficam bem abaixo disso; a OpenAI aceita até 25 MB
const AUDIO_MAX_BYTES = 20 * 1024 * 1024

const kindSchema = z.enum(["audio", "image", "pdf"])
type Kind = z.infer<typeof kindSchema>

const registerSchema = z.object({
  kind: kindSchema,
  storagePath: z.string().min(3).max(300),
  title: z.string().trim().max(200).optional(),
  durationSeconds: z.number().optional(),
})

class UploadError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

function jsonError(status: number, error: string) {
  return Response.json({ error }, { status })
}

function safeName(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+/, "")
  return (base || "arquivo").slice(-80)
}

/* Confere tipo e tamanho; devolve o mime limpo e, no áudio, a extensão. */
function validate(kind: Kind, rawMime: string, size: number, name: string, duration?: number) {
  const mime = rawMime.split(";")[0].trim().toLowerCase()
  if (size <= 0) throw new UploadError(400, "O arquivo está vazio.")
  if (kind === "image") {
    if (!(UPLOAD_LIMITS.imageTypes as readonly string[]).includes(mime)) {
      throw new UploadError(415, "Imagem não suportada. Envie JPG, PNG, WEBP ou HEIC.")
    }
    if (size > UPLOAD_LIMITS.imageBytes) throw new UploadError(413, "A imagem passa de 10 MB. Envie uma menor.")
    return { mime, ext: "" }
  }
  if (kind === "pdf") {
    const isPdf = mime === "application/pdf" || ((!mime || mime === "application/octet-stream") && name.toLowerCase().endsWith(".pdf"))
    if (!isPdf) throw new UploadError(415, "Envie um arquivo PDF.")
    if (size > UPLOAD_LIMITS.pdfBytes) throw new UploadError(413, "O PDF passa de 20 MB. Envie um menor.")
    return { mime: "application/pdf", ext: "" }
  }
  const ext = AUDIO_TYPES[mime]
  if (!ext) throw new UploadError(415, "Formato de áudio não suportado. Grave de novo pelo app.")
  if (size > AUDIO_MAX_BYTES) throw new UploadError(413, "O áudio ficou grande demais. Grave um áudio de até 5 minutos.")
  if (duration !== undefined && Number.isFinite(duration) && duration > UPLOAD_LIMITS.audioSeconds + 5) {
    throw new UploadError(413, "O áudio passa de 5 minutos. Grave um mais curto.")
  }
  return { mime, ext }
}

/* Antes de gravar: áudio precisa da OpenAI e do modelo de transcrição; e o limite do dia. */
async function preflight(userId: string, kind: Kind) {
  if (kind === "audio") {
    if (!getOpenAI()) throw new UploadError(503, MISSING_KEY_MESSAGE)
    if (!serverEnv.OPENAI_TRANSCRIBE_MODEL) {
      throw new UploadError(503, "A transcrição de áudio ainda não foi configurada. Defina OPENAI_TRANSCRIBE_MODEL no ambiente.")
    }
  }
  const limitMessage = await checkDailyLimit(userId, kind === "audio" ? "audio" : "attachments")
  if (limitMessage) throw new UploadError(429, limitMessage)
}

async function transcribe(buffer: Buffer, fileName: string, mime: string) {
  const openai = getOpenAI()
  const model = serverEnv.OPENAI_TRANSCRIBE_MODEL
  if (!openai || !model) throw new UploadError(503, MISSING_KEY_MESSAGE)
  try {
    const res = await openai.audio.transcriptions.create({
      file: await toFile(buffer, fileName, { type: mime }),
      model,
      language: "pt",
    })
    const text = res.text.trim()
    if (!text) throw new UploadError(422, "Não consegui entender o áudio. Fale mais perto do microfone e tente de novo.")
    return text
  } catch (err) {
    if (err instanceof UploadError) throw err
    logAIError("transcribe", err)
    throw new UploadError(502, "Não consegui transcrever o áudio. Tente gravar de novo.")
  }
}

export async function POST(request: Request) {
  const session = await getActiveUser()
  if (!session) return jsonError(401, "Faça login para continuar.")
  const userId = session.user.id
  const admin = createAdminClient()
  let uploadedPath: string | null = null
  let removeOnError = false

  try {
    const isJson = (request.headers.get("content-type") ?? "").includes("application/json")
    let kind: Kind
    let mime: string
    let size: number
    let title: string
    let buffer: Buffer | null = null
    let audioFileName = ""

    if (!isJson) {
      // ── modo 1: multipart ─────────────────────────────
      let form: FormData
      try {
        form = await request.formData()
      } catch {
        throw new UploadError(400, "Envio inválido. Tente de novo.")
      }
      const file = form.get("file")
      const kindParsed = kindSchema.safeParse(form.get("kind"))
      if (!(file instanceof File) || !kindParsed.success) {
        throw new UploadError(400, "Envie um arquivo e o tipo (áudio, imagem ou PDF).")
      }
      kind = kindParsed.data
      const originalName = file.name?.trim() || ""
      const durationRaw = form.get("durationSeconds")
      const checked = validate(kind, file.type || "", file.size, originalName, durationRaw ? Number(durationRaw) : undefined)
      mime = checked.mime
      size = file.size
      await preflight(userId, kind)

      title = kind === "audio" ? "Áudio" : originalName || (kind === "pdf" ? "Documento.pdf" : "Imagem")
      const fileName =
        kind === "audio" ? `audio.${checked.ext}` : safeName(originalName || (kind === "pdf" ? "documento.pdf" : "imagem"))
      audioFileName = fileName
      const path = `${userId}/${randomUUID()}-${fileName}`
      buffer = Buffer.from(await file.arrayBuffer())

      // Storage com a sessão do usuário: o RLS só deixa gravar na pasta dela
      const supabase = await createClient()
      const { error: upErr } = await supabase.storage
        .from("chat-uploads")
        .upload(path, buffer, { contentType: mime, upsert: false })
      if (upErr) {
        console.error(`[uploads] falha no storage: ${upErr.message.slice(0, 120)}`)
        throw new UploadError(500, "Não consegui salvar o arquivo. Tente de novo.")
      }
      uploadedPath = path
      removeOnError = true
    } else {
      // ── modo 2: arquivo já no Storage ─────────────────
      const parsed = registerSchema.safeParse(await request.json().catch(() => null))
      if (!parsed.success) throw new UploadError(400, "Envio inválido. Tente de novo.")
      kind = parsed.data.kind
      const path = parsed.data.storagePath
      const [folder, ...rest] = path.split("/")
      const objectName = rest.join("/")
      if (folder !== userId || !objectName || rest.length !== 1 || path.includes("..")) {
        throw new UploadError(403, "Este arquivo não é seu.")
      }
      const { data: already } = await admin
        .from("message_attachments")
        .select("id")
        .eq("storage_path", path)
        .limit(1)
        .maybeSingle()
      if (already) throw new UploadError(409, "Este arquivo já foi registrado.")

      const { data: listed } = await admin.storage.from("chat-uploads").list(userId, { search: objectName, limit: 5 })
      const obj = listed?.find((o) => o.name === objectName)
      if (!obj) throw new UploadError(404, "Arquivo não encontrado. Envie de novo.")
      const meta = (obj.metadata ?? {}) as { size?: number; mimetype?: string }
      uploadedPath = path
      removeOnError = true
      const checked = validate(kind, meta.mimetype ?? "", Number(meta.size ?? 0), objectName, parsed.data.durationSeconds)
      mime = checked.mime
      size = Number(meta.size ?? 0)
      await preflight(userId, kind)
      title = parsed.data.title || (kind === "audio" ? "Áudio" : objectName.replace(/^[0-9a-f-]{36}-/, ""))
      audioFileName = `audio.${checked.ext || "webm"}`
      if (kind === "audio") {
        const { data: blob, error } = await admin.storage.from("chat-uploads").download(path)
        if (error || !blob) throw new UploadError(404, "Arquivo não encontrado. Envie de novo.")
        buffer = Buffer.from(await blob.arrayBuffer())
      }
    }

    // transcrição (só áudio)
    const transcript = kind === "audio" && buffer ? await transcribe(buffer, audioFileName, mime) : undefined

    const { data, error } = await admin
      .from("message_attachments")
      .insert({
        user_id: userId,
        kind,
        storage_path: uploadedPath!,
        mime,
        size_bytes: size,
        title,
        transcript: transcript ?? null,
      })
      .select("id")
      .single()
    if (error || !data) {
      console.error(`[uploads] falha ao gravar anexo: ${error?.code}`)
      throw new UploadError(500, "Não consegui registrar o arquivo. Tente de novo.")
    }

    await recordUsage(userId, kind === "audio" ? "audio" : "attachment", { attachment_id: data.id, kind, size })

    const result: UploadResult = { id: data.id, kind, title, mime, size, ...(transcript ? { transcript } : {}) }
    return Response.json(result)
  } catch (err) {
    if (uploadedPath && removeOnError) await admin.storage.from("chat-uploads").remove([uploadedPath])
    if (err instanceof UploadError) return jsonError(err.status, err.message)
    console.error(`[uploads] erro inesperado: ${err instanceof Error ? err.name : "desconhecido"}`)
    return jsonError(500, "Não consegui receber o arquivo. Tente de novo.")
  }
}
