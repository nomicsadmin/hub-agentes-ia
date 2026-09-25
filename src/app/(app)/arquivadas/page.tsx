import type { Metadata } from "next"
import { ArchiveIcon } from "@phosphor-icons/react/dist/ssr"
import { ConversationList } from "@/components/app/conversation-list"
import { EmptyState } from "@/components/app/dialogs"
import { AppHeader, PageBody } from "@/components/shell/app-header"
import { listConversations } from "../_lib/queries"

export const metadata: Metadata = { title: "Arquivadas" }

export default async function ArchivedPage() {
  const items = await listConversations({ kind: "archived" })
  return (
    <>
      <AppHeader title="Arquivadas" />
      <PageBody>
        {items.length === 0 ? (
          <EmptyState
            icon={<ArchiveIcon />}
            title="Nada arquivado"
            text="Arquive o que já terminou: sai da barra lateral, mas continua na busca."
          />
        ) : (
          <ConversationList items={items} />
        )}
      </PageBody>
    </>
  )
}
