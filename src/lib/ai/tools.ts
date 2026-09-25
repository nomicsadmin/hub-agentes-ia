import "server-only"
import { randomUUID } from "node:crypto"
import { z } from "zod"
import type { FunctionTool } from "openai/resources/responses/responses"
import { createAdminClient } from "@/lib/supabase/server"
import { checkDailyLimit, recordUsage } from "./limits"
import { renderMarkdownPdf } from "./pdf"
import { withBase } from "@/lib/base-path"
import { appConfig } from "@/config/app.config"
import { pub } from "@/config/copy"

/* Ferramenta que o modelo chama para entregar um documento em PDF. */
export const GERAR_PDF_TOOL: FunctionTool = {
  type: "function",
  name: "gerar_pdf",
  description:
    `Gera um PDF com a marca ${appConfig.name} a partir de um documento em markdown e entrega para ${pub.o} ${pub.um} como cartão de download no chat. Use quando ${pub.o} ${pub.um} pedir um PDF ou aceitar receber um entregável (checklist, roteiro, calendário, plano) em PDF.`,
  strict: true,
  parameters: {
    type: "object",
    properties: {
      titulo: { type: "string", description: "Título curto do documento, ex.: Checklist da semana 29/09 a 05/10" },
      conteudo_markdown: {
        type: "string",
        description:
          "Documento completo em markdown simples: títulos com ##, listas com -, checklists com - [ ], **negrito**, tabelas simples. Sem emojis.",
      },
    },
    required: ["titulo", "conteudo_markdown"],
    additionalProperties: false,
  },
}

export const gerarPdfArgs = z.object({
  titulo: z.string().trim().min(1).max(160),
  conteudo_markdown: z.string().min(1).max(60_000),
})

export type GeneratedPdf = { id: string; kind: "generated_pdf"; title: string; url: string }

/*
 * Monta o PDF, salva em generated/{user_id}/{uuid}.pdf e cria o anexo
 * ligado à mensagem do agente. Só chamar depois de validar o usuário.
 */
export async function createGeneratedPdf(params: {
  userId: string
  messageId: string
  title: string
  markdown: string
  agentName: string
}): Promise<{ ok: true; pdf: GeneratedPdf } | { ok: false; reason: string }> {
  const limit = await checkDailyLimit(params.userId, "pdfs")
  if (limit) return { ok: false, reason: limit }

  const buffer = await renderMarkdownPdf({ title: params.title, markdown: params.markdown, subtitle: params.agentName })
  const admin = createAdminClient()
  const path = `${params.userId}/${randomUUID()}.pdf`
  const { error: upErr } = await admin.storage
    .from("generated")
    .upload(path, buffer, { contentType: "application/pdf", upsert: false })
  if (upErr) {
    console.error(`[pdf] falha ao salvar no storage: ${upErr.message.slice(0, 120)}`)
    return { ok: false, reason: "Não consegui salvar o PDF agora." }
  }

  const { data, error } = await admin
    .from("message_attachments")
    .insert({
      message_id: params.messageId,
      user_id: params.userId,
      kind: "generated_pdf",
      storage_path: path,
      mime: "application/pdf",
      size_bytes: buffer.length,
      title: params.title,
    })
    .select("id")
    .single()
  if (error || !data) {
    await admin.storage.from("generated").remove([path])
    console.error(`[pdf] falha ao gravar o anexo: ${error?.code}`)
    return { ok: false, reason: "Não consegui registrar o PDF agora." }
  }

  await recordUsage(params.userId, "pdf", { attachment_id: data.id, source: "tool" })
  return { ok: true, pdf: { id: data.id, kind: "generated_pdf", title: params.title, url: withBase(`/api/pdf/${data.id}`) } }
}
