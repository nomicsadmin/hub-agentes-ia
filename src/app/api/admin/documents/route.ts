import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/server"
import { extractText, estimateTokens } from "@/lib/knowledge/extract"
import { reindexDocument } from "@/lib/knowledge/embed"
import { adminRouteGuard, jsonError } from "@/lib/admin/guard"
import { DOC_MAX_BYTES, docExtension, docMime, safeFileName, titleFromFileName } from "@/lib/admin/documents"

/*
 * POST /api/admin/documents
 * Ingestão de um documento da base de um agente:
 *   1. o arquivo fica no bucket privado `knowledge`;
 *   2. extractText converte em texto e estimateTokens mede;
 *   3. cria knowledge_documents + agent_documents com a prioridade.
 *
 * Aceita dois formatos:
 *   - JSON { agentId, storagePath, filename, title?, priority? } depois
 *     que o navegador subiu o arquivo pela URL assinada (arquivos grandes);
 *   - multipart com `file`, `agentId`, `title?`, `priority?` (arquivos pequenos).
 */

export const runtime = "nodejs"
export const maxDuration = 120

const base = {
  agentId: z.uuid({ message: "Agente inválido." }),
  title: z.string().trim().max(200, { message: "Título muito longo." }).optional(),
  priority: z.coerce.number().int().min(0).max(100).default(0),
}

const jsonSchema = z.object({
  ...base,
  storagePath: z.string().min(1).max(500),
  filename: z.string().trim().min(1).max(255),
})

const formSchema = z.object(base)

type Admin = ReturnType<typeof createAdminClient>

export async function POST(request: Request) {
  const guard = await adminRouteGuard()
  if ("response" in guard) return guard.response
  const userId = guard.session.user.id
  const db = createAdminClient()

  const contentType = request.headers.get("content-type") ?? ""
  let agentId: string
  let title: string
  let priority: number
  let filename: string
  let storagePath: string
  let buffer: Buffer
  let mime: string

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null)
    if (!form) return jsonError("Não foi possível ler o envio.")
    const file = form.get("file")
    if (!(file instanceof File) || file.size === 0) return jsonError("Escolha um arquivo para enviar.")
    if (file.size > DOC_MAX_BYTES) return jsonError("O arquivo passa de 50 MB. Divida em partes menores.")
    const parsed = formSchema.safeParse({
      agentId: form.get("agentId"),
      title: form.get("title") || undefined,
      priority: form.get("priority") || 0,
    })
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Dados inválidos.")
    if (!docExtension(file.name)) return jsonError("Formato não suportado. Envie PDF, DOCX, MD ou TXT.")

    ;({ agentId, priority } = parsed.data)
    filename = file.name
    title = parsed.data.title || titleFromFileName(filename)
    mime = docMime(filename, file.type)
    buffer = Buffer.from(await file.arrayBuffer())
    storagePath = `agents/${agentId}/${crypto.randomUUID()}-${safeFileName(filename)}`

    const { error } = await db.storage.from("knowledge").upload(storagePath, buffer, { contentType: mime })
    if (error) {
      console.error("[admin/documents] upload", error.message)
      return jsonError("Não foi possível guardar o arquivo. Tente de novo.", 500)
    }
  } else {
    const parsed = jsonSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Dados inválidos.")
    ;({ agentId, priority, filename, storagePath } = parsed.data)
    // só aceita caminhos gerados por /upload-url para este agente
    const expected = new RegExp(`^agents/${agentId}/[0-9a-f-]{36}-[A-Za-z0-9-_]+\\.(pdf|docx|md|txt)$`)
    if (!expected.test(storagePath)) return jsonError("Caminho de arquivo inválido.")
    if (!docExtension(filename)) return jsonError("Formato não suportado. Envie PDF, DOCX, MD ou TXT.")
    title = parsed.data.title || titleFromFileName(filename)
    mime = docMime(filename)

    const { data: blob, error } = await db.storage.from("knowledge").download(storagePath)
    if (error || !blob) {
      console.error("[admin/documents] download", error?.message)
      return jsonError("O arquivo não chegou ao armazenamento. Envie de novo.", 400)
    }
    if (blob.size > DOC_MAX_BYTES) {
      await db.storage.from("knowledge").remove([storagePath])
      return jsonError("O arquivo passa de 50 MB. Divida em partes menores.")
    }
    buffer = Buffer.from(await blob.arrayBuffer())
  }

  const { data: agent } = await db.from("agents").select("id").eq("id", agentId).maybeSingle()
  if (!agent) {
    await db.storage.from("knowledge").remove([storagePath])
    return jsonError("Agente não encontrado.", 404)
  }

  const { data: doc, error: insertError } = await db
    .from("knowledge_documents")
    .insert({ title, storage_path: storagePath, mime, status: "processing", created_by: userId })
    .select("id")
    .single()
  if (insertError || !doc) {
    console.error("[admin/documents] insert", insertError?.message)
    await db.storage.from("knowledge").remove([storagePath])
    return jsonError("Não foi possível registrar o documento. Tente de novo.", 500)
  }

  const { error: linkError } = await db
    .from("agent_documents")
    .insert({ agent_id: agentId, document_id: doc.id, priority })
  if (linkError) {
    console.error("[admin/documents] link", linkError.message)
    await db.from("knowledge_documents").delete().eq("id", doc.id)
    await db.storage.from("knowledge").remove([storagePath])
    return jsonError("Não foi possível ligar o documento ao agente. Tente de novo.", 500)
  }

  const result = await processDocument(db, doc.id, buffer, mime, filename)
  revalidatePath("/admin", "layout")
  return NextResponse.json({ document: { id: doc.id, title, ...result } }, { status: 201 })
}

async function processDocument(db: Admin, id: string, buffer: Buffer, mime: string, filename: string) {
  let content: string
  try {
    content = await extractText(buffer, mime, filename)
  } catch (err) {
    console.error("[admin/documents] extract", err)
    const message =
      err instanceof Error && err.message.startsWith("Formato não suportado")
        ? err.message
        : "Não foi possível ler o texto do arquivo. Confira se ele abre normalmente e envie de novo."
    await db
      .from("knowledge_documents")
      .update({ status: "error", error: message, updated_at: new Date().toISOString() })
      .eq("id", id)
    return { status: "error" as const, error: message, tokenEstimate: 0 }
  }

  // PDF escaneado vem só com as marcas de página
  const meaningful = content.replace(/\[página \d+\]/g, "").trim()
  if (meaningful.length < 20) {
    const message = "O arquivo não tem texto selecionável (parece digitalizado). Envie uma versão com texto."
    await db
      .from("knowledge_documents")
      .update({ status: "error", error: message, content, updated_at: new Date().toISOString() })
      .eq("id", id)
    return { status: "error" as const, error: message, tokenEstimate: 0 }
  }

  const tokenEstimate = estimateTokens(content)
  const { error } = await db
    .from("knowledge_documents")
    .update({ status: "ready", content, token_estimate: tokenEstimate, error: null, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) {
    console.error("[admin/documents] update", error.message)
    return { status: "error" as const, error: "O texto foi lido, mas não foi salvo. Tente de novo.", tokenEstimate: 0 }
  }

  // trechos e embeddings para a busca por trechos; se falhar, o documento continua pronto
  let indexed = true
  try {
    await reindexDocument(id, content)
  } catch (err) {
    indexed = false
    console.error("[admin/documents] reindex", err)
  }
  return { status: "ready" as const, error: null, tokenEstimate, indexed }
}
