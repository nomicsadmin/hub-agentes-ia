import { cookies } from "next/headers"
import { requireUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { AppDataProvider } from "@/components/app/app-data"
import { ChatStoreProvider } from "@/components/app/chat-store"
import { ConversationActionsProvider } from "@/components/app/conversation-actions"
import { TermsNotice } from "@/components/app/terms-notice"
import { toStarters } from "@/components/app/types"
import { AppShell } from "@/components/shell/app-shell"
import { RAIL_COOKIE } from "@/components/shell/constants"
import { CONVERSATION_FIELDS, isNewVisit } from "./_lib/queries"

/*
 * LAYOUT DO APP (usuário e admin)
 * Exige login com acesso ativo, registra o acesso (no máximo um a
 * cada 30 min) e monta a barra lateral com os dados reais.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireUser()
  const supabase = await createClient()

  // registro de uso: abriu o app depois de 30 min
  if (isNewVisit(profile.last_seen_at)) {
    const now = new Date().toISOString()
    const [upd, evt] = await Promise.all([
      supabase
        .from("profiles")
        .update({ last_seen_at: now, access_count: (profile.access_count ?? 0) + 1 })
        .eq("id", user.id),
      supabase.from("usage_events").insert({ user_id: user.id, kind: "open_app" }),
    ])
    if (upd.error || evt.error) console.error("[app] falha ao registrar acesso:", upd.error?.code ?? evt.error?.code)
  }

  const [conversations, agents, folders, tags, cookieStore] = await Promise.all([
    supabase
      .from("conversations")
      .select(CONVERSATION_FIELDS)
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(150),
    supabase.from("agents").select("id, slug, name, description, icon, starters").eq("is_active", true).order("sort"),
    supabase.from("folders").select("id, name").order("name"),
    supabase.from("tags").select("id, name").order("name"),
    cookies(),
  ])

  const appData = {
    profile: { id: profile.id, email: profile.email, fullName: profile.full_name, role: profile.role },
    agents: (agents.data ?? []).map((a) => ({ ...a, starters: toStarters(a.starters) })),
    folders: folders.data ?? [],
    tags: tags.data ?? [],
  }

  return (
    <AppDataProvider value={appData}>
      <ChatStoreProvider>
        <ConversationActionsProvider>
          <AppShell conversations={conversations.data ?? []} initialCollapsed={cookieStore.get(RAIL_COOKIE)?.value === "1"}>
            {children}
          </AppShell>
          {!profile.accepted_terms_at && <TermsNotice />}
        </ConversationActionsProvider>
      </ChatStoreProvider>
    </AppDataProvider>
  )
}
