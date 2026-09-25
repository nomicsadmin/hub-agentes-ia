import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/server"
import { adminRouteGuard, jsonError } from "@/lib/admin/guard"
import { DOC_MAX_BYTES, docExtension, safeFileName } from "@/lib/admin/documents"

/*
 * POST /api/admin/documents/upload-url
 * Gera uma URL assinada para o navegador subir o arquivo direto no
 * bucket privado `knowledge`. Assim arquivos grandes não passam pelo
 * limite de corpo da função (4,5 MB na Vercel). Depois o navegador
 * chama POST /api/admin/documents com o caminho para processar.
 */

const schema = z.object({
  agentId: z.uuid({ message: "Agente inválido." }),
  filename: z.string().trim().min(1).max(255),
  size: z.number().int().positive().max(DOC_MAX_BYTES, { message: "O arquivo passa de 50 MB. Divida em partes menores." }),
})

export async function POST(request: Request) {
  const guard = await adminRouteGuard()
  if ("response" in guard) return guard.response

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Dados inválidos.")
  const { agentId, filename } = parsed.data
  if (!docExtension(filename)) return jsonError("Formato não suportado. Envie PDF, DOCX, MD ou TXT.")

  const path = `agents/${agentId}/${crypto.randomUUID()}-${safeFileName(filename)}`
  const { data, error } = await createAdminClient().storage.from("knowledge").createSignedUploadUrl(path)
  if (error || !data) {
    console.error("[admin/upload-url]", error?.message)
    return jsonError("Não foi possível preparar o envio. Tente de novo.", 500)
  }
  return NextResponse.json({ path: data.path, token: data.token })
}
