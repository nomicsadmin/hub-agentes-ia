import type { Metadata } from "next"
import { requireUser } from "@/lib/auth/session"
import { TrashIcon } from "@phosphor-icons/react/dist/ssr"
import { ConversationList, EmptyTrashButton } from "@/components/app/conversation-list"
import { EmptyState } from "@/components/app/dialogs"
import { AppHeader, PageBody } from "@/components/shell/app-header"
import { listConversations } from "../_lib/queries"
import { getTrashRetentionDays } from "../_lib/purge"

export const metadata: Metadata = { title: "Lixeira" }

export default async function TrashPage() {
  await requireUser() // antes de ler a configuração com a service role
  const [items, days] = await Promise.all([listConversations({ kind: "trash" }), getTrashRetentionDays()])
  return (
    <>
      <AppHeader title="Lixeira" actions={<EmptyTrashButton count={items.length} />} />
      <PageBody>
        <p className="mb-4 text-meta text-ink-3">
          O que está aqui é apagado para sempre depois de {days} dias. Restaure para voltar ao histórico.
        </p>
        {items.length === 0 ? (
          <EmptyState icon={<TrashIcon />} title="Lixeira vazia" />
        ) : (
          <ConversationList items={items} variant="trash" retentionDays={days} />
        )}
      </PageBody>
    </>
  )
}
