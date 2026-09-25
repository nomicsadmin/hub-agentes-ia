import type { Metadata } from "next"
import { PushPinIcon } from "@phosphor-icons/react/dist/ssr"
import { ConversationList } from "@/components/app/conversation-list"
import { EmptyState } from "@/components/app/dialogs"
import { AppHeader, PageBody } from "@/components/shell/app-header"
import { listConversations } from "../_lib/queries"

export const metadata: Metadata = { title: "Fixadas" }

export default async function PinnedPage() {
  const items = await listConversations({ kind: "pinned" })
  return (
    <>
      <AppHeader title="Fixadas" />
      <PageBody>
        {items.length === 0 ? (
          <EmptyState icon={<PushPinIcon />} title="Nada fixado" text="Fixe as conversas que você usa sempre. Elas ficam no topo da barra lateral." />
        ) : (
          <ConversationList items={items} />
        )}
      </PageBody>
    </>
  )
}
