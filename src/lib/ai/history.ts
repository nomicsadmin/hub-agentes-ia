import "server-only"
import type {
  EasyInputMessage,
  ResponseInputContent,
  ResponseInputItem,
} from "openai/resources/responses/responses"
import { createAdminClient } from "@/lib/supabase/server"
import { pub } from "@/config/copy"

/*
 * Histórico da conversa no formato da Responses API.
 * - últimas HISTORY_LIMIT mensagens (sem as de erro e as vazias);
 * - áudio entra pela transcrição;
 * - imagem e PDF só vão como arquivo nas mensagens mais recentes
 *   (MEDIA_WINDOW); nas antigas vira uma nota de texto, para não
 *   reenviar arquivos pesados a cada pergunta.
 * Arquivos vão em base64 (estável entre requisições, bom para o cache).
 */

export const HISTORY_LIMIT = 30
const MEDIA_WINDOW = 6
const OPENAI_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

type AttachmentRow = {
  id: string
  message_id: string | null
  kind: string
  storage_path: string
  mime: string
  title: string | null
  transcript: string | null
}

async function downloadBase64(bucket: string, path: string) {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(bucket).download(path)
  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer()).toString("base64")
}

/* Converte os anexos de uma mensagem do usuário em partes de entrada. */
export async function attachmentParts(atts: AttachmentRow[], withMedia: boolean): Promise<ResponseInputContent[]> {
  const parts: ResponseInputContent[] = []
  for (const att of atts) {
    const name = att.title || "arquivo"
    if (att.kind === "audio") {
      const text = att.transcript?.trim()
      parts.push({
        type: "input_text",
        text: text ? `[Áudio ${pub.do} ${pub.um}, transcrição]\n${text}` : `[${pub.O} ${pub.um} mandou um áudio, mas a transcrição não ficou disponível.]`,
      })
      continue
    }
    if (att.kind === "generated_pdf") continue
    if (!withMedia) {
      parts.push({ type: "input_text", text: `[Anexo enviado antes nesta conversa: ${att.kind === "pdf" ? "PDF" : "imagem"} "${name}"]` })
      continue
    }
    if (att.kind === "image") {
      if (!OPENAI_IMAGE_TYPES.includes(att.mime)) {
        parts.push({
          type: "input_text",
          text: `[${pub.O} ${pub.um} mandou a imagem "${name}" em um formato que não consigo abrir (${att.mime}). Peça para ${pub.ele} mandar em JPG ou PNG, ou tirar um print.]`,
        })
        continue
      }
      const b64 = await downloadBase64("chat-uploads", att.storage_path)
      parts.push(
        b64
          ? { type: "input_image", detail: "auto", image_url: `data:${att.mime};base64,${b64}` }
          : { type: "input_text", text: `[A imagem "${name}" não está mais disponível.]` }
      )
      continue
    }
    if (att.kind === "pdf") {
      const b64 = await downloadBase64("chat-uploads", att.storage_path)
      parts.push(
        b64
          ? { type: "input_file", filename: name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`, file_data: `data:application/pdf;base64,${b64}` }
          : { type: "input_text", text: `[O PDF "${name}" não está mais disponível.]` }
      )
    }
  }
  return parts
}

export type HistoryResult = {
  input: ResponseInputItem[]
  /** texto da última mensagem do usuário (com transcrições), para RAG, título e classificação */
  lastUserText: string
  /** quantas trocas completas do agente já existiam antes desta resposta */
  priorAssistantCount: number
}

export async function buildHistory(conversationId: string, excludeMessageId: string): Promise<HistoryResult> {
  const admin = createAdminClient()
  const { data: rows } = await admin
    .from("messages")
    .select("id, role, content, status, created_at")
    .eq("conversation_id", conversationId)
    .neq("id", excludeMessageId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT)

  const messages = (rows ?? [])
    .reverse()
    .filter((m) => m.role === "user" || (m.status !== "error" && m.status !== "streaming" && m.content.trim()))

  const ids = messages.map((m) => m.id)
  const { data: atts } = ids.length
    ? await admin
        .from("message_attachments")
        .select("id, message_id, kind, storage_path, mime, title, transcript")
        .in("message_id", ids)
        .order("created_at", { ascending: true })
    : { data: [] as AttachmentRow[] }

  const byMessage = new Map<string, AttachmentRow[]>()
  for (const a of atts ?? []) {
    if (!a.message_id) continue
    const list = byMessage.get(a.message_id) ?? []
    list.push(a)
    byMessage.set(a.message_id, list)
  }

  const input: ResponseInputItem[] = []
  let lastUserText = ""
  let priorAssistantCount = 0

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]
    const msgAtts = byMessage.get(m.id) ?? []
    if (m.role === "assistant") {
      priorAssistantCount++
      const pdfs = msgAtts.filter((a) => a.kind === "generated_pdf").map((a) => `[PDF gerado e entregue: "${a.title ?? "documento"}"]`)
      const text = [m.content.trim(), ...pdfs].filter(Boolean).join("\n\n")
      input.push({ role: "assistant", content: text } satisfies EasyInputMessage)
      continue
    }
    const withMedia = i >= messages.length - MEDIA_WINDOW
    const parts: ResponseInputContent[] = []
    if (m.content.trim()) parts.push({ type: "input_text", text: m.content.trim() })
    parts.push(...(await attachmentParts(msgAtts, withMedia)))
    if (parts.length === 0) parts.push({ type: "input_text", text: "(mensagem vazia)" })
    input.push({ role: "user", content: parts } satisfies EasyInputMessage)

    lastUserText = [
      m.content.trim(),
      ...msgAtts.filter((a) => a.kind === "audio" && a.transcript).map((a) => a.transcript!.trim()),
    ]
      .filter(Boolean)
      .join("\n")
  }

  return { input, lastUserText, priorAssistantCount }
}
