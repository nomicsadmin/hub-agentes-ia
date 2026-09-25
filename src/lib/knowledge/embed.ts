import "server-only"
import { serverEnv } from "@/lib/env.server"
import { getOpenAI } from "@/lib/ai/openai"
import { createAdminClient } from "@/lib/supabase/server"
import { chunkText } from "./chunk"

/*
 * Trechos e embeddings da base (RAG). Só são usados quando a base de
 * um agente passa de FULL_CONTEXT_TOKEN_LIMIT; até lá o texto inteiro
 * vai no prompt. Mesmo assim, reindexDocument deixa os trechos prontos.
 */

export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  const openai = getOpenAI()
  if (!openai || texts.length === 0) return null
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += 64) {
    const res = await openai.embeddings.create({
      model: serverEnv.OPENAI_EMBEDDING_MODEL,
      input: texts.slice(i, i + 64),
    })
    for (const item of res.data) out.push(item.embedding)
  }
  return out
}

/*
 * Refaz os trechos de um documento a partir de knowledge_documents.content.
 * Uso pelo admin depois de subir ou editar um documento. Sem a chave da
 * OpenAI, grava os trechos sem embedding (a busca os ignora até rodar de novo).
 */
export async function reindexDocument(documentId: string, content: string) {
  const admin = createAdminClient()
  const chunks = chunkText(content)
  const embeddings = await embedTexts(chunks)
  const { error: delErr } = await admin.from("knowledge_chunks").delete().eq("document_id", documentId)
  if (delErr) throw new Error("Não consegui limpar os trechos antigos.")
  for (let i = 0; i < chunks.length; i += 100) {
    const rows = chunks.slice(i, i + 100).map((c, j) => ({
      document_id: documentId,
      chunk_index: i + j,
      content: c,
      embedding: embeddings ? JSON.stringify(embeddings[i + j]) : null,
    }))
    const { error } = await admin.from("knowledge_chunks").insert(rows)
    if (error) throw new Error("Não consegui gravar os trechos do documento.")
  }
  return { chunks: chunks.length, embedded: Boolean(embeddings) }
}

/* Trechos mais parecidos com a pergunta, só dos documentos do agente. */
export async function searchChunks(agentId: string, question: string, count = 8) {
  const embeddings = await embedTexts([question])
  if (!embeddings) return []
  const admin = createAdminClient()
  const { data, error } = await admin.rpc("match_chunks", {
    p_agent_id: agentId,
    p_embedding: JSON.stringify(embeddings[0]),
    p_count: count,
  })
  if (error) {
    console.error(`[rag] match_chunks falhou: ${error.code}`)
    return []
  }
  return data ?? []
}
