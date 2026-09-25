"use server"

import { refresh } from "next/cache"
import { z } from "zod"
import { getActiveUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/types"
import { purgeConversations } from "./_lib/purge"

type ConversationUpdate = Database["public"]["Tables"]["conversations"]["Update"]

/*
 * AÇÕES DO ESPAÇO DO USUÁRIO
 * Tudo passa pelo cliente com a sessão da pessoa (RLS). Só "apagar
 * para sempre" usa a service role, e só depois de confirmar que
 * as conversas são dela e já estão na lixeira.
 */

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string }

const id = z.string().uuid()
const name = z.string().trim().min(1, "Digite um nome.").max(80, "Use até 80 caracteres.")

async function session() {
  const s = await getActiveUser()
  if (!s) return null
  return { user: s.user, supabase: await createClient() }
}

const NO_SESSION = { ok: false as const, error: "Sua sessão expirou. Entre de novo para continuar." }
const FAILED = { ok: false as const, error: "Não foi possível salvar agora. Tente de novo em instantes." }

function invalid(error: z.ZodError) {
  return { ok: false as const, error: error.issues[0]?.message ?? "Dados inválidos." }
}

/* ── Conversas ─────────────────────────────────────────── */

async function updateConversation(conversationId: string, patch: ConversationUpdate): Promise<ActionResult> {
  const parsed = id.safeParse(conversationId)
  if (!parsed.success) return invalid(parsed.error)
  const s = await session()
  if (!s) return NO_SESSION
  const { error } = await s.supabase.from("conversations").update(patch).eq("id", parsed.data)
  if (error) return FAILED
  refresh()
  return { ok: true, data: null }
}

export async function renameConversation(conversationId: string, title: string): Promise<ActionResult> {
  const parsed = z.string().trim().min(1, "Digite um título.").max(120, "Use até 120 caracteres.").safeParse(title)
  if (!parsed.success) return invalid(parsed.error)
  return updateConversation(conversationId, { title: parsed.data })
}

export async function setPinned(conversationId: string, pinned: boolean) {
  return updateConversation(conversationId, { pinned: z.boolean().parse(pinned) })
}

export async function setArchived(conversationId: string, archived: boolean) {
  return updateConversation(conversationId, { archived_at: z.boolean().parse(archived) ? new Date().toISOString() : null })
}

export async function moveToTrash(conversationId: string) {
  return updateConversation(conversationId, { deleted_at: new Date().toISOString(), pinned: false })
}

export async function restoreConversation(conversationId: string) {
  return updateConversation(conversationId, { deleted_at: null })
}

export async function moveToFolder(conversationId: string, folderId: string | null) {
  const parsed = id.nullable().safeParse(folderId)
  if (!parsed.success) return invalid(parsed.error)
  return updateConversation(conversationId, { folder_id: parsed.data })
}

/* Apagar para sempre: só o que é dela e já está na lixeira. */
async function deleteForeverIds(ids: string[] | "all"): Promise<ActionResult<number>> {
  const s = await session()
  if (!s) return NO_SESSION
  let q = s.supabase.from("conversations").select("id").eq("user_id", s.user.id).not("deleted_at", "is", null)
  if (ids !== "all") q = q.in("id", ids)
  const { data, error } = await q
  if (error) return FAILED
  const owned = (data ?? []).map((r) => r.id)
  if (owned.length === 0) return { ok: true, data: 0 }
  try {
    await purgeConversations(owned)
  } catch (e) {
    console.error("[lixeira] falha ao apagar:", e instanceof Error ? e.message : e)
    return { ok: false, error: "Não foi possível apagar agora. Tente de novo em instantes." }
  }
  refresh()
  return { ok: true, data: owned.length }
}

export async function deleteForever(conversationId: string) {
  const parsed = id.safeParse(conversationId)
  if (!parsed.success) return invalid(parsed.error)
  return deleteForeverIds([parsed.data])
}

export async function emptyTrash() {
  return deleteForeverIds("all")
}

/* ── Pastas ────────────────────────────────────────────── */

export async function createFolder(folderName: string): Promise<ActionResult<{ id: string; name: string }>> {
  const parsed = name.safeParse(folderName)
  if (!parsed.success) return invalid(parsed.error)
  const s = await session()
  if (!s) return NO_SESSION
  const { data, error } = await s.supabase.from("folders").insert({ name: parsed.data }).select("id, name").single()
  if (error || !data) return FAILED
  refresh()
  return { ok: true, data }
}

export async function renameFolder(folderId: string, folderName: string): Promise<ActionResult> {
  const p = z.object({ id, name }).safeParse({ id: folderId, name: folderName })
  if (!p.success) return invalid(p.error)
  const s = await session()
  if (!s) return NO_SESSION
  const { error } = await s.supabase.from("folders").update({ name: p.data.name }).eq("id", p.data.id)
  if (error) return FAILED
  refresh()
  return { ok: true, data: null }
}

/* As conversas não são apagadas: só saem da pasta (folder_id vira nulo). */
export async function deleteFolder(folderId: string): Promise<ActionResult> {
  const parsed = id.safeParse(folderId)
  if (!parsed.success) return invalid(parsed.error)
  const s = await session()
  if (!s) return NO_SESSION
  const { error } = await s.supabase.from("folders").delete().eq("id", parsed.data)
  if (error) return FAILED
  refresh()
  return { ok: true, data: null }
}

/* ── Tags ──────────────────────────────────────────────── */

export async function createTag(tagName: string): Promise<ActionResult<{ id: string; name: string }>> {
  const parsed = z.string().trim().min(1, "Digite um nome.").max(40, "Use até 40 caracteres.").safeParse(tagName)
  if (!parsed.success) return invalid(parsed.error)
  const s = await session()
  if (!s) return NO_SESSION
  const { data, error } = await s.supabase.from("tags").insert({ name: parsed.data }).select("id, name").single()
  if (error?.code === "23505") return { ok: false, error: "Você já tem uma tag com esse nome." }
  if (error || !data) return FAILED
  refresh()
  return { ok: true, data }
}

export async function renameTag(tagId: string, tagName: string): Promise<ActionResult> {
  const p = z.object({ id, name: z.string().trim().min(1, "Digite um nome.").max(40) }).safeParse({ id: tagId, name: tagName })
  if (!p.success) return invalid(p.error)
  const s = await session()
  if (!s) return NO_SESSION
  const { error } = await s.supabase.from("tags").update({ name: p.data.name }).eq("id", p.data.id)
  if (error?.code === "23505") return { ok: false, error: "Você já tem uma tag com esse nome." }
  if (error) return FAILED
  refresh()
  return { ok: true, data: null }
}

export async function deleteTag(tagId: string): Promise<ActionResult> {
  const parsed = id.safeParse(tagId)
  if (!parsed.success) return invalid(parsed.error)
  const s = await session()
  if (!s) return NO_SESSION
  const { error } = await s.supabase.from("tags").delete().eq("id", parsed.data)
  if (error) return FAILED
  refresh()
  return { ok: true, data: null }
}

export async function setConversationTag(conversationId: string, tagId: string, on: boolean): Promise<ActionResult> {
  const p = z.object({ c: id, t: id, on: z.boolean() }).safeParse({ c: conversationId, t: tagId, on })
  if (!p.success) return invalid(p.error)
  const s = await session()
  if (!s) return NO_SESSION
  const { error } = p.data.on
    ? await s.supabase.from("conversation_tags").upsert({ conversation_id: p.data.c, tag_id: p.data.t }, { ignoreDuplicates: true })
    : await s.supabase.from("conversation_tags").delete().eq("conversation_id", p.data.c).eq("tag_id", p.data.t)
  if (error) return FAILED
  refresh()
  return { ok: true, data: null }
}

/* ── Mensagens ─────────────────────────────────────────── */

export async function setFeedback(messageId: string, value: 1 | -1 | null): Promise<ActionResult> {
  const p = z.object({ id, value: z.union([z.literal(1), z.literal(-1), z.null()]) }).safeParse({ id: messageId, value })
  if (!p.success) return invalid(p.error)
  const s = await session()
  if (!s) return NO_SESSION
  const { error } = await s.supabase
    .from("messages")
    .update({ feedback: p.data.value })
    .eq("id", p.data.id)
    .eq("role", "assistant")
  if (error) return FAILED
  return { ok: true, data: null }
}

/* ── Perfil ────────────────────────────────────────────── */

export async function updateName(fullName: string): Promise<ActionResult> {
  const parsed = z.string().trim().min(2, "Digite seu nome.").max(80, "Use até 80 caracteres.").safeParse(fullName)
  if (!parsed.success) return invalid(parsed.error)
  const s = await session()
  if (!s) return NO_SESSION
  const { error } = await s.supabase.from("profiles").update({ full_name: parsed.data }).eq("id", s.user.id)
  if (error) return FAILED
  refresh()
  return { ok: true, data: null }
}

export async function acceptTerms(): Promise<ActionResult> {
  const s = await session()
  if (!s) return NO_SESSION
  const { error } = await s.supabase
    .from("profiles")
    .update({ accepted_terms_at: new Date().toISOString() })
    .eq("id", s.user.id)
  if (error) return FAILED
  refresh()
  return { ok: true, data: null }
}
