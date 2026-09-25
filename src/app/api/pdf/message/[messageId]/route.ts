import { NextResponse } from "next/server"
import { z } from "zod"
import { getActiveUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { recordUsage } from "@/lib/ai/limits"
import { pdfFileName, renderMarkdownPdf } from "@/lib/ai/pdf"
import { DEFAULT_CONVERSATION_TITLE } from "@/lib/ai/title"

/*
 * GET /api/pdf/message/[messageId]
 * Botão "Baixar em PDF" de uma resposta do agente: monta o PDF na hora
 * (não salva no Storage) e devolve como download, com o nome a partir
 * do título da conversa. A posse vem do RLS + checagem de user_id.
 */

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(_request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params
  if (!z.uuid().safeParse(messageId).success) {
    return NextResponse.json({ error: "Mensagem não encontrada." }, { status: 404 })
  }

  const session = await getActiveUser()
  if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 })

  const supabase = await createClient()
  const { data: msg } = await supabase
    .from("messages")
    .select("id, user_id, role, content, created_at, conversation_id, conversations(title, agents(name))")
    .eq("id", messageId)
    .maybeSingle()
  if (!msg || msg.user_id !== session.user.id || msg.role !== "assistant") {
    return NextResponse.json({ error: "Mensagem não encontrada." }, { status: 404 })
  }
  if (!msg.content.trim()) {
    return NextResponse.json({ error: "Esta resposta está vazia." }, { status: 400 })
  }

  const title = msg.conversations?.title?.trim() || DEFAULT_CONVERSATION_TITLE
  const agentName = msg.conversations?.agents?.name ?? undefined

  let pdf: Buffer
  try {
    pdf = await renderMarkdownPdf({ title, markdown: msg.content, subtitle: agentName, date: new Date(msg.created_at) })
  } catch (err) {
    console.error(`[pdf] falha ao montar: ${err instanceof Error ? err.name : "desconhecido"}`)
    return NextResponse.json({ error: "Não consegui montar o PDF. Tente de novo." }, { status: 500 })
  }

  await recordUsage(session.user.id, "pdf", { message_id: msg.id, source: "button" })

  const name = pdfFileName(title)
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
    },
  })
}
