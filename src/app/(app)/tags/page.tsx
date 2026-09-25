import type { Metadata } from "next"
import { ChatsIcon, TagIcon } from "@phosphor-icons/react/dist/ssr"
import { createClient } from "@/lib/supabase/server"
import { ConversationList } from "@/components/app/conversation-list"
import { EmptyState } from "@/components/app/dialogs"
import { NewTagButton, TagChips, TagMenu } from "@/components/app/tags"
import { AppHeader, PageBody } from "@/components/shell/app-header"
import { listByTag } from "../_lib/queries"

export const metadata: Metadata = { title: "Tags" }

export default async function TagsPage({ searchParams }: { searchParams: Promise<{ tag?: string | string[] }> }) {
  const { tag } = await searchParams
  const supabase = await createClient()
  const { data } = await supabase
    .from("tags")
    .select("id, name, conversation_tags(conversation_id, conversations!inner(deleted_at))")
    .order("name")
  const tags = (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    count: (t.conversation_tags ?? []).filter((ct) => !ct.conversations?.deleted_at).length,
  }))
  const selected = tags.find((t) => t.id === (typeof tag === "string" ? tag : null)) ?? null
  const items = selected ? await listByTag(selected.id) : []

  return (
    <>
      <AppHeader title="Tags" actions={<NewTagButton />} />
      <PageBody className="flex flex-col gap-6">
        {tags.length === 0 ? (
          <EmptyState
            icon={<TagIcon />}
            title="Nenhuma tag ainda"
            text="Crie tags como “Oferta”, “Trailer” ou “Semana 2” e marque as conversas pelo menu de cada uma."
          />
        ) : (
          <>
            <TagChips tags={tags} selected={selected?.id ?? null} />
            {selected ? (
              <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-ui font-semibold text-ink">
                    {items.length} {items.length === 1 ? "conversa" : "conversas"} com “{selected.name}”
                  </h2>
                  <TagMenu tag={selected} />
                </div>
                {items.length === 0 ? (
                  <EmptyState icon={<ChatsIcon />} title="Nenhuma conversa com esta tag" />
                ) : (
                  <ConversationList items={items} />
                )}
              </section>
            ) : (
              <p className="text-ui text-ink-2">Escolha uma tag para ver as conversas.</p>
            )}
          </>
        )}
      </PageBody>
    </>
  )
}
