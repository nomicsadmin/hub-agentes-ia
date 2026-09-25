/*
 * CONTRATO DO CHAT (compartilhado entre a interface e a API)
 *
 * POST /api/chat  (JSON: ChatRequest)
 * Resposta: text/event-stream, uma linha "data: <ChatEvent JSON>\n\n" por evento.
 * Parar: o navegador aborta o fetch (AbortController); o servidor
 * percebe, grava o que já tinha e marca a mensagem como "stopped".
 */

export type ChatRequest = {
  /** conversa existente; ausente = cria uma nova com o agente de agentSlug */
  conversationId?: string
  agentSlug: string
  message: string
  /** ids em message_attachments enviados antes por /api/uploads (fase 2.5) */
  attachmentIds?: string[]
  /** refaz a última resposta do agente em vez de enviar mensagem nova */
  regenerate?: boolean
}

export type ChatEvent =
  | { type: "meta"; conversationId: string; userMessageId: string | null; assistantMessageId: string }
  | { type: "status"; label: string } // ex.: "Lendo o material", "Gerando PDF"
  | { type: "delta"; text: string }
  | { type: "attachment"; attachment: { id: string; kind: "generated_pdf"; title: string; url: string } }
  | { type: "done"; title?: string }
  | { type: "error"; message: string }

export function encodeEvent(event: ChatEvent) {
  return `data: ${JSON.stringify(event)}\n\n`
}

/* Lê o stream no navegador e entrega cada evento. */
export async function readChatStream(res: Response, onEvent: (e: ChatEvent) => void) {
  if (!res.body) throw new Error("Resposta sem corpo")
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx).trim()
      buffer = buffer.slice(idx + 2)
      if (chunk.startsWith("data: ")) onEvent(JSON.parse(chunk.slice(6)) as ChatEvent)
    }
  }
}

/*
 * UPLOADS (fase 2.5)
 * POST /api/uploads  multipart/form-data: file, kind ("audio" | "image" | "pdf")
 * Resposta: UploadResult. O arquivo vai para chat-uploads/{user_id}/...
 * e vira uma linha em message_attachments ainda sem message_id; o id
 * volta em ChatRequest.attachmentIds e /api/chat faz o vínculo.
 * Áudio: o servidor transcreve antes de responder (transcript preenchido).
 *
 * GET /api/pdf/[attachmentId]  redireciona para uma URL assinada e temporária.
 */
export type UploadResult = {
  id: string
  kind: "audio" | "image" | "pdf"
  title: string
  mime: string
  size: number
  /** só para áudio */
  transcript?: string
}

export const UPLOAD_LIMITS = {
  pdfBytes: 20 * 1024 * 1024,
  imageBytes: 10 * 1024 * 1024,
  audioSeconds: 300,
  filesPerMessage: 5,
  imageTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
} as const
