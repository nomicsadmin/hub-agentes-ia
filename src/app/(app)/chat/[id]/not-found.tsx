import Link from "next/link"
import { ChatCircleIcon } from "@phosphor-icons/react/dist/ssr"
import { EmptyState } from "@/components/app/dialogs"
import { AppHeader, PageBody } from "@/components/shell/app-header"

export default function ConversationNotFound() {
  return (
    <>
      <AppHeader title="Conversa" />
      <PageBody>
        <EmptyState
          icon={<ChatCircleIcon />}
          title="Conversa não encontrada"
          text="Ela pode ter sido apagada para sempre ou o link está incompleto."
          action={
            <Link href="/chat" className="mt-2 text-ui font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
              Começar uma conversa nova
            </Link>
          }
        />
      </PageBody>
    </>
  )
}
