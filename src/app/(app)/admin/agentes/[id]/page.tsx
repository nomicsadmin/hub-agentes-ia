import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr"
import { z } from "zod"
import { requireAdmin } from "@/lib/auth/session"
import { getAgentDetail } from "@/lib/admin/data"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/admin/primitives"
import { AgentWorkspace, type AgentTab } from "@/components/admin/agent/agent-workspace"
import { pub } from "@/config/copy"

const TABS: AgentTab[] = ["prompt", "correcoes", "documentos", "avaliacoes"]

export default async function AdminAgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAdmin()
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()
  const [detail, sp] = await Promise.all([getAgentDetail(id), searchParams])
  if (!detail) notFound()

  const aba = Array.isArray(sp.aba) ? sp.aba[0] : sp.aba
  const initialTab = TABS.includes(aba as AgentTab) ? (aba as AgentTab) : "prompt"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={
          <Link href="/admin/agentes" className="mb-1 inline-flex w-fit items-center gap-1.5 text-meta text-ink-2 hover:text-ink">
            <ArrowLeftIcon className="size-4" />
            Agentes
          </Link>
        }
        title={detail.agent.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{detail.agent.description}</span>
            {!detail.agent.is_active && <Badge variant="outline">Oculto {pub.dos} {pub.varios}</Badge>}
          </span>
        }
      />
      <AgentWorkspace detail={detail} initialTab={initialTab} />
    </div>
  )
}
