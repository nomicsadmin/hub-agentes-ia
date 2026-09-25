import Link from "next/link"
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr"
import { requireAdmin } from "@/lib/auth/session"
import { listAgentsOverview } from "@/lib/admin/data"
import { formatDate, formatNumber } from "@/lib/admin/format"
import { FULL_CONTEXT_TOKEN_LIMIT } from "@/lib/knowledge/extract"
import { Badge } from "@/components/ui/badge"
import { EmptyState, PageHeader } from "@/components/admin/primitives"
import { pub } from "@/config/copy"

export default async function AdminAgentsPage() {
  await requireAdmin()
  const agents = await listAgentsOverview()

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Agentes"
        description={`Prompt, correções, documentos e avaliações de cada agente. Toda mudança vale a partir da próxima mensagem ${pub.dos} ${pub.varios}.`}
      />

      {agents.length === 0 ? (
        <EmptyState title="Nenhum agente cadastrado.">
          Crie os agentes na pasta agentes/ e rode npm run agentes:sync (veja docs/07-inteligencia-e-agentes.md).
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {agents.map((a) => {
            const over = a.tokens > FULL_CONTEXT_TOKEN_LIMIT
            return (
              <li key={a.id}>
                <Link
                  href={`/admin/agentes/${a.id}`}
                  className="group flex h-full flex-col gap-3 rounded-control border border-line bg-canvas p-4 transition-colors duration-100 hover:border-line-strong hover:bg-hover"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="flex items-center gap-2">
                        <span className="text-body font-semibold text-ink">{a.name}</span>
                        {!a.is_active && <Badge variant="outline">Oculto {pub.dos} {pub.varios}</Badge>}
                      </span>
                      <span className="line-clamp-2 text-ui text-ink-2">{a.description}</span>
                    </div>
                    <CaretRightIcon className="mt-1 size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-3 text-meta">
                    <div className="flex flex-col">
                      <dt className="font-normal text-ink-3">Documentos</dt>
                      <dd className="text-ink tabular-nums">
                        {formatNumber(a.documents)} · {formatNumber(a.tokens)} tokens
                        {over && <span className="block text-micro text-ink-2">Busca por trechos</span>}
                      </dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="font-normal text-ink-3">Correções ativas</dt>
                      <dd className="text-ink tabular-nums">{formatNumber(a.corrections)}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="font-normal text-ink-3">Prompt</dt>
                      <dd className="text-ink">{a.promptUpdatedAt ? `Salvo em ${formatDate(a.promptUpdatedAt)}` : "Sem prompt"}</dd>
                    </div>
                  </dl>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
