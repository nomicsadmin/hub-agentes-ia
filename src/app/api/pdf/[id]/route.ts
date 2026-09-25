import { NextResponse } from "next/server"
import { z } from "zod"
import { getActiveUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { pdfFileName } from "@/lib/ai/pdf"

/*
 * GET /api/pdf/[id]
 * Redireciona para uma URL assinada de 60 s do anexo. Serve o PDF gerado
 * pelo agente (bucket generated) e também os anexos do usuário (áudio,
 * imagem, PDF em chat-uploads), para o player e a prévia no chat.
 * ?download=1 força o download com o nome do arquivo.
 * A posse é conferida duas vezes: RLS (sessão do usuário) e user_id.
 */

export const runtime = "nodejs"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 })

  const session = await getActiveUser()
  if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 })

  const supabase = await createClient()
  const { data: att } = await supabase
    .from("message_attachments")
    .select("id, user_id, kind, storage_path, title")
    .eq("id", id)
    .maybeSingle()
  if (!att || att.user_id !== session.user.id) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 })
  }

  const bucket = att.kind === "generated_pdf" ? "generated" : "chat-uploads"
  const wantsDownload = new URL(request.url).searchParams.get("download") === "1"
  const downloadName =
    att.kind === "generated_pdf" ? pdfFileName(att.title ?? "documento") : att.title || att.storage_path.split("/").pop()

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(att.storage_path, 60, wantsDownload ? { download: downloadName ?? true } : undefined)
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Arquivo indisponível no momento." }, { status: 404 })
  }

  const res = NextResponse.redirect(data.signedUrl, 302)
  res.headers.set("Cache-Control", "private, no-store")
  return res
}
