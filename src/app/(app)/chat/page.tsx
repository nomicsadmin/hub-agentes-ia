import type { Metadata } from "next"
import { RobotIcon } from "@phosphor-icons/react/dist/ssr"
import { ChatView } from "@/components/app/chat-view"
import { EmptyState } from "@/components/app/dialogs"
import { AppHeader, PageBody } from "@/components/shell/app-header"
import { getAgents } from "../_lib/queries"

export const metadata: Metadata = { title: "Novo chat" }

/* /chat?agente=slug: conversa nova; sem agente, o primeiro da galeria. */
export default async function NewChatPage({ searchParams }: { searchParams: Promise<{ agente?: string | string[] }> }) {
  const { agente } = await searchParams
  const agents = await getAgents()
  if (agents.length === 0) {
    return (
      <>
        <AppHeader title="Novo chat" />
        <PageBody>
          <EmptyState icon={<RobotIcon />} title="Nenhum agente disponível" text="Assim que um agente for liberado, ele aparece aqui." />
        </PageBody>
      </>
    )
  }
  const slug = typeof agente === "string" ? agente : undefined
  const agent = agents.find((a) => a.slug === slug) ?? agents[0]
  return (
    <ChatView key={agent.slug} conversationId={null} conversation={null} agent={agent} agents={agents} initialMessages={[]} />
  )
}
