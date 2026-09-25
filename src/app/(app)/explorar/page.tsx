import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRightIcon, RobotIcon } from "@phosphor-icons/react/dist/ssr"
import { AgentIcon } from "@/components/app/agent-icon"
import { EmptyState } from "@/components/app/dialogs"
import { AppHeader, PageBody } from "@/components/shell/app-header"
import { getAgents } from "../_lib/queries"

export const metadata: Metadata = { title: "Agentes" }

export default async function AgentsPage() {
  const agents = await getAgents()
  return (
    <>
      <AppHeader title="Agentes" />
      <PageBody>
        <p className="mb-5 text-ui text-ink-2 max-md:hidden">Cada agente estuda um material diferente. Escolha com quem conversar.</p>
        {agents.length === 0 ? (
          <EmptyState icon={<RobotIcon />} title="Nenhum agente disponível" text="Assim que um agente for liberado, ele aparece aqui." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {agents.map((a) => (
              <li key={a.id} className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-4 md:p-5">
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line text-ink">
                    <AgentIcon name={a.icon} className="size-[22px]" />
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <h2 className="type-label text-body font-semibold text-ink">{a.name}</h2>
                    {a.description && <p className="text-ui text-ink-2">{a.description}</p>}
                  </div>
                </div>
                {a.starters.length > 0 && (
                  <ul className="flex flex-col gap-1 border-t border-line pt-3">
                    {a.starters.slice(0, 3).map((s) => (
                      <li key={s} className="truncate text-meta text-ink-3">
                        “{s}”
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href={`/chat?agente=${a.slug}`}
                  className="fill-primary type-label mt-auto flex h-11 items-center justify-center gap-2 rounded-control px-4 text-ui font-medium transition-opacity hover:opacity-85"
                >
                  Conversar
                  <ArrowRightIcon className="size-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  )
}
