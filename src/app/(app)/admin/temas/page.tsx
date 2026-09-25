import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr"
import { requireAdmin } from "@/lib/auth/session"
import { getTopicsReport } from "@/lib/admin/data"
import { formatDateTime, formatNumber, weekLabel } from "@/lib/admin/format"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DataTable,
  EmptyState,
  PageHeader,
  Panel,
  RankList,
  SectionTitle,
  Td,
  Th,
  WeekBars,
} from "@/components/admin/primitives"
import { AgentFilter } from "@/components/admin/agent-filter"
import { TopicsEditor } from "@/components/admin/topics-editor"
import { withBase } from "@/lib/base-path"
import { pub } from "@/config/copy"

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })

export default async function AdminTopicsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAdmin()
  const sp = await searchParams
  const raw = Array.isArray(sp.agente) ? sp.agente[0] : sp.agente
  const agentId = raw && /^[0-9a-f-]{36}$/i.test(raw) ? raw : undefined
  const r = await getTopicsReport(agentId)
  const agentName = agentId ? r.agents.find((a) => a.id === agentId)?.name : null

  const csv = (tipo: string) => withBase(`/api/admin/temas/csv?tipo=${tipo}${agentId ? `&agente=${agentId}` : ""}`)
  const gridMax = Math.max(1, ...r.grid.flatMap((g) => g.values))
  const scope = agentName ? ` com o ${agentName}` : ""

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Temas e dificuldades"
        description={`Cada pergunta ${pub.dos} ${pub.varios} é classificada em um tema depois que a resposta sai. Use para planejar aulas, lives e o que falta no material.`}
        actions={
          <>
            <AgentFilter agents={r.agents} value={agentId ?? ""} />
            <a href={csv("resumo")} download className={buttonVariants({ variant: "secondary" })}>
              <DownloadSimpleIcon />
              Exportar CSV
            </a>
          </>
        }
      />

      {r.total === 0 ? (
        <EmptyState title="Nenhuma pergunta registrada ainda.">
          Os temas aparecem assim que {pub.os} {pub.varios} começarem a conversar{scope}.
        </EmptyState>
      ) : (
        <>
          <p className="-mt-4 text-meta font-normal text-ink-2 tabular-nums">
            {formatNumber(r.total)} {r.total === 1 ? "pergunta classificada" : "perguntas classificadas"}
            {agentName ? ` no ${agentName}` : " em todos os agentes"}
          </p>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="flex flex-col gap-3">
              <SectionTitle title="Mais perguntados" description="Número de perguntas por tema." />
              <Panel className="p-4">
                <RankList
                  valueLabel="Perguntas por tema"
                  items={r.mostAsked.map((t) => ({
                    key: t.topic,
                    label: t.topic,
                    value: t.questions,
                    detail: `${formatNumber(t.students)} ${t.students === 1 ? pub.um : pub.varios}`,
                  }))}
                />
              </Panel>
            </section>
            <section className="flex flex-col gap-3">
              <SectionTitle
                title="Com mais dificuldade"
                description="Soma dos sinais: pergunta repetida, confusão, avaliação negativa, conversa longa e lacuna."
              />
              <Panel className="p-4">
                <RankList
                  valueLabel="Pontos de dificuldade por tema"
                  items={r.hardest.map((t) => ({
                    key: t.topic,
                    label: t.topic,
                    value: t.difficulty,
                    detail: `média ${decimal.format(t.avgDifficulty)} por pergunta`,
                  }))}
                  empty={
                    <EmptyState title="Nenhum sinal de dificuldade ainda." className="border-none p-0">
                      {pub.Os} {pub.varios} estão perguntando, mas sem sinais de que travaram.
                    </EmptyState>
                  }
                />
              </Panel>
            </section>
          </div>

          <section className="flex flex-col gap-3">
            <SectionTitle
              title="Evolução semanal"
              description="Perguntas classificadas nas últimas 8 semanas, de segunda a domingo."
            />
            <Panel className="flex flex-col gap-6 p-4 md:p-5">
              <WeekBars
                label="Perguntas por semana"
                unit={["pergunta", "perguntas"]}
                data={r.weeks.map((w, i) => ({ label: weekLabel(w), value: r.weeklyTotal[i] }))}
              />
              {r.grid.length > 0 && (
                <DataTable minWidth={720} label="Perguntas por tema e semana" className="border-line">
                  <thead>
                    <tr>
                      <Th>Tema</Th>
                      {r.weeks.map((w) => (
                        <Th key={w} align="right" className="tabular-nums">
                          {weekLabel(w)}
                        </Th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {r.grid.map((g) => (
                      <tr key={g.topic}>
                        <Td className="whitespace-nowrap">{g.topic}</Td>
                        {g.values.map((v, i) => {
                          const level = v === 0 ? 0 : 0.08 + (v / gridMax) * 0.72
                          return (
                            <Td
                              key={r.weeks[i]}
                              align="right"
                              className={level > 0.5 ? "font-semibold text-ink-inverse" : v === 0 ? "text-ink-4" : "text-ink"}
                            >
                              <span
                                className="-mx-1.5 block rounded-row px-1.5 py-0.5"
                                style={{
                                  backgroundColor: level
                                    ? `color-mix(in srgb, var(--ink) ${Math.round(level * 100)}%, transparent)`
                                    : undefined,
                                }}
                              >
                                {v}
                              </span>
                            </Td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              )}
            </Panel>
          </section>

          <section className="flex flex-col gap-3">
            <SectionTitle
              title="Lacunas do material"
              description="Perguntas que o agente respondeu dizendo que a informação não está no material. É a lista do que falta nos documentos."
              actions={
                r.gaps.length > 0 && (
                  <a href={csv("lacunas")} download className={buttonVariants({ variant: "secondary", size: "sm" })}>
                    <DownloadSimpleIcon />
                    Exportar lacunas
                  </a>
                )
              }
            />
            {r.gaps.length === 0 ? (
              <EmptyState title="Nenhuma lacuna registrada.">
                Quando o agente disser que algo não está no material, a pergunta aparece aqui agrupada por tema.
              </EmptyState>
            ) : (
              <ul className="flex flex-col divide-y divide-line rounded-control border border-line">
                {r.gaps.map((g) => (
                  <li key={g.topic}>
                    <details className="group">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 hover:bg-hover [&::-webkit-details-marker]:hidden">
                        <span className="text-ui font-medium text-ink">{g.topic}</span>
                        <span className="flex items-center gap-2 text-meta font-normal text-ink-2 tabular-nums">
                          {formatNumber(g.total)} {g.total === 1 ? "pergunta" : "perguntas"}
                          <span aria-hidden className="transition-transform group-open:rotate-90">›</span>
                        </span>
                      </summary>
                      <ul className="flex flex-col gap-2 border-t border-line px-4 py-3">
                        {g.items.map((item, i) => (
                          <li key={i} className="flex flex-col gap-0.5">
                            <span className="text-ui text-ink">{item.summary}</span>
                            <span className="flex flex-wrap items-center gap-x-2 text-micro text-ink-3">
                              {item.subtopic && <Badge variant="outline">{item.subtopic}</Badge>}
                              <span>{item.agent}</span>
                              <span aria-hidden>·</span>
                              <span>{formatDateTime(item.createdAt)}</span>
                            </span>
                          </li>
                        ))}
                        {g.total > g.items.length && (
                          <li className="text-micro text-ink-3">
                            Mais {formatNumber(g.total - g.items.length)} no CSV de lacunas.
                          </li>
                        )}
                      </ul>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-wrap gap-2">
            <a href={csv("perguntas")} download className={buttonVariants({ variant: "quiet", size: "sm" })}>
              <DownloadSimpleIcon />
              Exportar todas as perguntas classificadas
            </a>
          </div>
        </>
      )}

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <SectionTitle
          title="Lista de temas"
          description="Temas que a classificação pode usar. Renomear atualiza o histórico; desativar tira o tema das próximas classificações sem apagar o que já foi contado. Deixe “Outros” sempre ativo."
        />
        <TopicsEditor topics={r.topics} />
      </section>
    </div>
  )
}
