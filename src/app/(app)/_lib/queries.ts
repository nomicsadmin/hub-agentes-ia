import "server-only"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { toStarters, type AgentInfo, type ConversationSummary } from "@/components/app/types"

export const CONVERSATION_FIELDS = "id, title, agent_id, pinned, folder_id, archived_at, deleted_at, updated_at"

export type ListFilter =
  | { kind: "active" }
  | { kind: "pinned" }
  | { kind: "archived" }
  | { kind: "trash" }
  | { kind: "folder"; folderId: string }

/* Listas do espaço do usuário. RLS garante que só vêm as conversas dela. */
export async function listConversations(filter: ListFilter, limit = 200): Promise<ConversationSummary[]> {
  const supabase = await createClient()
  let q = supabase.from("conversations").select(CONVERSATION_FIELDS)

  switch (filter.kind) {
    case "active":
      q = q.is("deleted_at", null).is("archived_at", null)
      break
    case "pinned":
      q = q.is("deleted_at", null).is("archived_at", null).eq("pinned", true)
      break
    case "archived":
      q = q.is("deleted_at", null).not("archived_at", "is", null)
      break
    case "trash":
      q = q.not("deleted_at", "is", null)
      break
    case "folder":
      q = q.is("deleted_at", null).eq("folder_id", filter.folderId)
      break
  }

  const order = filter.kind === "trash" ? "deleted_at" : filter.kind === "archived" ? "archived_at" : "updated_at"
  const { data } = await q.order(order, { ascending: false }).limit(limit)
  return data ?? []
}

export async function listByTag(tagId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("conversations")
    .select(`${CONVERSATION_FIELDS}, conversation_tags!inner(tag_id)`)
    .eq("conversation_tags.tag_id", tagId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(200)
  return (data ?? []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { conversation_tags, ...rest } = row
    return rest
  })
}

/* Uso do app: 30 minutos sem abrir conta como um novo acesso. */
export function isNewVisit(lastSeenAt: string | null) {
  if (!lastSeenAt) return true
  return Date.now() - new Date(lastSeenAt).getTime() > 30 * 60 * 1000
}

/* Agentes ativos, na ordem da galeria. */
export const getAgents = cache(async (): Promise<AgentInfo[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("agents")
    .select("id, slug, name, description, icon, starters")
    .eq("is_active", true)
    .order("sort")
  return (data ?? []).map((a) => ({ ...a, starters: toStarters(a.starters) }))
})
