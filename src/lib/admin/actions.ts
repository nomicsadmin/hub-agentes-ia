"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/server"
import { estimateTokens } from "@/lib/knowledge/extract"
import { reindexDocument } from "@/lib/knowledge/embed"
import { grantAccessByEmail, setAccessStatus, setRole } from "@/lib/access"
import { formatDate } from "./format"
import { getAdminSession, type AdminSession } from "./guard"

/*
 * Server actions do admin. Cada uma confere o papel admin no
 * servidor, valida a entrada com zod e devolve { ok, error } em
 * português, sem expor detalhes do banco.
 */

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string }

const uuid = z.uuid({ message: "Identificador inválido." })

async function run<S extends z.ZodType, T>(
  schema: S,
  input: unknown,
  fn: (data: z.infer<S>, session: AdminSession) => Promise<T>,
  fallback = "Não foi possível salvar. Tente de novo.",
  revalidate = true
): Promise<ActionResult<T>> {
  const session = await getAdminSession()
  if (!session) return { ok: false, error: "Acesso restrito ao admin." }
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }
  try {
    const data = await fn(parsed.data, session)
    if (revalidate) revalidatePath("/admin", "layout")
    return { ok: true, data }
  } catch (err) {
    if (err instanceof UserFacingError) return { ok: false, error: err.message }
    console.error("[admin]", err)
    return { ok: false, error: fallback }
  }
}

class UserFacingError extends Error {}

function check(res: { error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message)
}

/* ── Usuários ────────────────────────────────────────────── */

export async function setUserStatusAction(input: { userId: string; status: "active" | "blocked" }) {
  return run(
    z.object({ userId: uuid, status: z.enum(["active", "blocked"]) }),
    input,
    async ({ userId, status }, session) => {
      if (userId === session.user.id && status === "blocked") {
        throw new UserFacingError("Você não pode bloquear o próprio acesso.")
      }
      await setAccessStatus(userId, status)
      return null
    },
    "Não foi possível mudar o acesso. Tente de novo."
  )
}

export async function setUserRoleAction(input: { userId: string; role: "student" | "admin" }) {
  return run(
    z.object({ userId: uuid, role: z.enum(["student", "admin"]) }),
    input,
    async ({ userId, role }, session) => {
      if (userId === session.user.id && role !== "admin") {
        throw new UserFacingError("Você não pode remover o próprio acesso de admin.")
      }
      await setRole(userId, role)
      return null
    },
    "Não foi possível mudar o papel. Tente de novo."
  )
}

export async function addStudentAction(input: { email: string; fullName?: string }) {
  return run(
    z.object({
      email: z.email({ message: "Digite um e-mail válido, como nome@exemplo.com." }).max(254),
      fullName: z.string().trim().max(120, { message: "Nome muito longo." }).optional(),
    }),
    input,
    async ({ email, fullName }) => {
      const result = await grantAccessByEmail({ email, fullName: fullName || undefined, source: "manual" })
      return result
    },
    "Não foi possível liberar esse e-mail. Confira o endereço e tente de novo."
  )
}

/* ── Prompt ──────────────────────────────────────────────── */

async function createPromptVersion(agentId: string, content: string, note: string | null, userId: string) {
  const db = createAdminClient()
  const { data: agent } = await db.from("agents").select("id").eq("id", agentId).maybeSingle()
  if (!agent) throw new UserFacingError("Agente não encontrado.")

  // 1. grava a nova versão ainda sem ser a atual
  const { data: created, error } = await db
    .from("agent_prompt_versions")
    .insert({ agent_id: agentId, content, note, is_current: false, created_by: userId })
    .select("id")
    .single()
  if (error || !created) throw new Error(error?.message ?? "sem versão")

  // 2. desmarca a atual (o índice único permite só uma por agente)
  const { data: previous, error: unsetError } = await db
    .from("agent_prompt_versions")
    .update({ is_current: false })
    .eq("agent_id", agentId)
    .eq("is_current", true)
    .select("id")
  if (unsetError) throw new Error(unsetError.message)

  // 3. marca a nova; se falhar, devolve a anterior para o agente não ficar sem prompt
  const { error: setError } = await db.from("agent_prompt_versions").update({ is_current: true }).eq("id", created.id)
  if (setError) {
    if (previous?.[0]) {
      await db.from("agent_prompt_versions").update({ is_current: true }).eq("id", previous[0].id)
    }
    throw new Error(setError.message)
  }
  return created.id
}

export async function savePromptAction(input: { agentId: string; content: string; note?: string }) {
  return run(
    z.object({
      agentId: uuid,
      content: z
        .string()
        .trim()
        .min(20, { message: "O prompt está curto demais. Descreva como o agente deve agir." })
        .max(60_000, { message: "O prompt passou de 60 mil caracteres. Mova o conteúdo longo para um documento." }),
      note: z.string().trim().max(200, { message: "A nota pode ter até 200 caracteres." }).optional(),
    }),
    input,
    async ({ agentId, content, note }, session) => {
      const db = createAdminClient()
      const { data: current } = await db
        .from("agent_prompt_versions")
        .select("content")
        .eq("agent_id", agentId)
        .eq("is_current", true)
        .maybeSingle()
      if (current?.content.trim() === content) {
        throw new UserFacingError("Nada mudou em relação à versão atual.")
      }
      return createPromptVersion(agentId, content, note || null, session.user.id)
    }
  )
}

export async function restorePromptAction(input: { agentId: string; versionId: string }) {
  return run(z.object({ agentId: uuid, versionId: uuid }), input, async ({ agentId, versionId }, session) => {
    const db = createAdminClient()
    const { data: version } = await db
      .from("agent_prompt_versions")
      .select("content, created_at, is_current")
      .eq("id", versionId)
      .eq("agent_id", agentId)
      .maybeSingle()
    if (!version) throw new UserFacingError("Versão não encontrada.")
    if (version.is_current) throw new UserFacingError("Essa já é a versão atual.")
    // restaurar cria uma nova versão com o texto antigo: o histórico nunca se perde
    return createPromptVersion(
      agentId,
      version.content,
      `Restaurada da versão de ${formatDate(version.created_at)}`,
      session.user.id
    )
  })
}

/* ── Correções ───────────────────────────────────────────── */

export async function saveCorrectionAction(input: {
  agentId: string
  id?: string
  content: string
  sourceMessageId?: string | null
}) {
  return run(
    z.object({
      agentId: uuid,
      id: uuid.optional(),
      content: z
        .string()
        .trim()
        .min(8, { message: "Escreva a correção com pelo menos uma frase." })
        .max(4_000, { message: "A correção pode ter até 4 mil caracteres." }),
      sourceMessageId: uuid.nullish(),
    }),
    input,
    async ({ agentId, id, content, sourceMessageId }, session) => {
      const db = createAdminClient()
      if (id) {
        check(await db.from("agent_corrections").update({ content }).eq("id", id).eq("agent_id", agentId))
        return id
      }
      const { data, error } = await db
        .from("agent_corrections")
        .insert({
          agent_id: agentId,
          content,
          is_active: true,
          source_message_id: sourceMessageId ?? null,
          created_by: session.user.id,
        })
        .select("id")
        .single()
      if (error || !data) throw new Error(error?.message ?? "sem correção")
      return data.id
    }
  )
}

export async function toggleCorrectionAction(input: { id: string; isActive: boolean }) {
  return run(z.object({ id: uuid, isActive: z.boolean() }), input, async ({ id, isActive }) => {
    check(await createAdminClient().from("agent_corrections").update({ is_active: isActive }).eq("id", id))
    return null
  })
}

export async function deleteCorrectionAction(input: { id: string }) {
  return run(
    z.object({ id: uuid }),
    input,
    async ({ id }) => {
      check(await createAdminClient().from("agent_corrections").delete().eq("id", id))
      return null
    },
    "Não foi possível apagar. Tente de novo."
  )
}

/* ── Documentos ──────────────────────────────────────────── */

export async function getDocumentAction(input: { documentId: string }) {
  return run(
    z.object({ documentId: uuid }),
    input,
    async ({ documentId }) => {
      const { data } = await createAdminClient()
        .from("knowledge_documents")
        .select("id, title, content, token_estimate, status, error, updated_at")
        .eq("id", documentId)
        .maybeSingle()
      if (!data) throw new UserFacingError("Documento não encontrado.")
      return data
    },
    "Não foi possível abrir o documento.",
    false
  )
}

export async function updateDocumentAction(input: { documentId: string; title: string; content: string }) {
  return run(
    z.object({
      documentId: uuid,
      title: z.string().trim().min(1, { message: "Dê um título ao documento." }).max(200),
      content: z.string().trim().min(1, { message: "O texto do documento está vazio." }).max(2_000_000, {
        message: "O texto passou de 2 milhões de caracteres. Divida em mais de um documento.",
      }),
    }),
    input,
    async ({ documentId, title, content }) => {
      const db = createAdminClient()
      check(
        await db
          .from("knowledge_documents")
          .update({
            title,
            content,
            token_estimate: estimateTokens(content),
            status: "ready",
            error: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", documentId)
      )
      // refaz os trechos da busca a partir do texto novo
      try {
        await reindexDocument(documentId, content)
        return { indexed: true }
      } catch (err) {
        console.error("[admin] reindex", err)
        // melhor sem trechos do que com trechos do texto antigo
        await db.from("knowledge_chunks").delete().eq("document_id", documentId)
        return { indexed: false }
      }
    }
  )
}

export async function setDocumentPriorityAction(input: { agentId: string; documentId: string; priority: number }) {
  return run(
    z.object({
      agentId: uuid,
      documentId: uuid,
      priority: z.number().int().min(0, { message: "Use um número de 0 a 100." }).max(100, { message: "Use um número de 0 a 100." }),
    }),
    input,
    async ({ agentId, documentId, priority }) => {
      check(
        await createAdminClient()
          .from("agent_documents")
          .update({ priority })
          .eq("agent_id", agentId)
          .eq("document_id", documentId)
      )
      return null
    }
  )
}

export async function linkDocumentAction(input: { agentId: string; documentId: string; priority: number }) {
  return run(
    z.object({ agentId: uuid, documentId: uuid, priority: z.number().int().min(0).max(100) }),
    input,
    async ({ agentId, documentId, priority }) => {
      check(
        await createAdminClient()
          .from("agent_documents")
          .upsert({ agent_id: agentId, document_id: documentId, priority }, { onConflict: "agent_id,document_id" })
      )
      return null
    }
  )
}

/*
 * Tira o documento do agente. Se nenhum outro agente usa o
 * documento, ele é apagado de vez (texto, trechos e arquivo).
 */
export async function unlinkDocumentAction(input: { agentId: string; documentId: string }) {
  return run(
    z.object({ agentId: uuid, documentId: uuid }),
    input,
    async ({ agentId, documentId }) => {
      const db = createAdminClient()
      check(await db.from("agent_documents").delete().eq("agent_id", agentId).eq("document_id", documentId))
      const { count } = await db
        .from("agent_documents")
        .select("agent_id", { count: "exact", head: true })
        .eq("document_id", documentId)
      if ((count ?? 0) > 0) return { deleted: false }

      const { data: doc } = await db.from("knowledge_documents").select("storage_path").eq("id", documentId).maybeSingle()
      check(await db.from("knowledge_documents").delete().eq("id", documentId))
      if (doc?.storage_path) {
        const { error } = await db.storage.from("knowledge").remove([doc.storage_path])
        if (error) console.error("[admin] arquivo do documento não foi removido", error.message)
      }
      return { deleted: true }
    },
    "Não foi possível remover o documento. Tente de novo."
  )
}

/* ── Temas ───────────────────────────────────────────────── */

export async function saveTopicAction(input: { id?: string; name: string; sort: number; isActive: boolean }) {
  return run(
    z.object({
      id: uuid.optional(),
      name: z.string().trim().min(2, { message: "Dê um nome ao tema." }).max(60, { message: "Use até 60 caracteres." }),
      sort: z.number().int().min(0, { message: "A ordem vai de 0 a 999." }).max(999, { message: "A ordem vai de 0 a 999." }),
      isActive: z.boolean(),
    }),
    input,
    async ({ id, name, sort, isActive }) => {
      const db = createAdminClient()
      const { data: clash } = await db.from("topics").select("id").eq("name", name).maybeSingle()
      if (clash && clash.id !== id) throw new UserFacingError("Já existe um tema com esse nome.")

      if (!id) {
        check(await db.from("topics").insert({ name, sort, is_active: isActive }))
        return null
      }
      const { data: old } = await db.from("topics").select("name").eq("id", id).maybeSingle()
      if (!old) throw new UserFacingError("Tema não encontrado.")
      check(await db.from("topics").update({ name, sort, is_active: isActive }).eq("id", id))
      // renomear leva junto o histórico já classificado
      if (old.name !== name) {
        check(await db.from("message_insights").update({ topic: name }).eq("topic", old.name))
      }
      return null
    }
  )
}

/* ── Configurações ──────────────────────────────────────── */

const limit = (label: string) =>
  z
    .number({ message: `${label}: use um número inteiro.` })
    .int({ message: `${label}: use um número inteiro.` })
    .min(0, { message: `${label}: o mínimo é 0.` })
    .max(10_000, { message: `${label}: o máximo é 10.000.` })

export async function saveSettingsAction(input: {
  limits: { messages: number; audio: number; attachments: number; pdfs: number }
  retentionDays: number
}) {
  return run(
    z.object({
      limits: z.object({
        messages: limit("Mensagens"),
        audio: limit("Áudios"),
        attachments: limit("Anexos"),
        pdfs: limit("PDFs gerados"),
      }),
      retentionDays: z
        .number({ message: "Dias na lixeira: use um número inteiro." })
        .int({ message: "Dias na lixeira: use um número inteiro." })
        .min(1, { message: "Dias na lixeira: o mínimo é 1." })
        .max(365, { message: "Dias na lixeira: o máximo é 365." }),
    }),
    input,
    async ({ limits, retentionDays }) => {
      const now = new Date().toISOString()
      check(
        await createAdminClient()
          .from("app_settings")
          .upsert([
            { key: "daily_limits", value: limits, updated_at: now },
            { key: "trash_retention_days", value: retentionDays, updated_at: now },
          ])
      )
      return null
    }
  )
}
