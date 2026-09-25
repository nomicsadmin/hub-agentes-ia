import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ChatsIcon } from "@phosphor-icons/react/dist/ssr"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ConversationList } from "@/components/app/conversation-list"
import { EmptyState } from "@/components/app/dialogs"
import { FolderMenu } from "@/components/app/folders"
import { AppHeader, PageBody } from "@/components/shell/app-header"
import { listConversations } from "../../_lib/queries"

export const metadata: Metadata = { title: "Pasta" }

export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) notFound()
  const supabase = await createClient()
  const { data: folder } = await supabase.from("folders").select("id, name").eq("id", id).maybeSingle()
  if (!folder) notFound()
  const items = await listConversations({ kind: "folder", folderId: id })
  return (
    <>
      <AppHeader title={folder.name} actions={<FolderMenu folder={folder} afterDelete="/pastas" />} />
      <PageBody>
        {items.length === 0 ? (
          <EmptyState
            icon={<ChatsIcon />}
            title="Pasta vazia"
            text="Abra o menu de uma conversa e escolha “Mover para pasta”."
          />
        ) : (
          <ConversationList items={items} />
        )}
      </PageBody>
    </>
  )
}
