import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr"
import { z } from "zod"
import { requireAdmin } from "@/lib/auth/session"
import { getUserDetail } from "@/lib/admin/data"
import { formatDate, formatDateTime, formatNumber, formatRelative } from "@/lib/admin/format"
import { ROLE_LABEL, purchaseLabel } from "@/lib/admin/labels"
import { Badge } from "@/components/ui/badge"
import {
  DataTable,
  EmptyState,
  PageHeader,
  Panel,
  RankList,
  SectionTitle,
  StatCard,
  Td,
  Th,
  Tr,
} from "@/components/admin/primitives"
import { UserActions } from "@/components/admin/user-actions"
import { pub } from "@/config/copy"
import { providerLabel } from "@/lib/payments"

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()
  const detail = await getUserDetail(id)
  if (!detail) notFound()

  const { profile, entitlements, counts, topics, insights } = detail
  const last = insights[0]
  const stuck = topics.filter((t) => t.difficulty > 0).slice(0, 8)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={
          <Link href="/admin/usuarios" className="mb-1 inline-flex w-fit items-center gap-1.5 text-meta text-ink-2 hover:text-ink">
            <ArrowLeftIcon className="size-4" />
            {pub.Varios}
          </Link>
        }
        title={profile.full_name || profile.email}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{profile.email}</span>
            <span aria-hidden className="text-ink-4">·</span>
            <span>Cadastro em {formatDate(profile.created_at)}</span>
            {profile.status === "blocked" ? <Badge variant="danger">Bloqueado</Badge> : <Badge>Liberado</Badge>}
            {profile.role === "admin" ? <Badge variant="solid">Admin</Badge> : <Badge variant="outline">{ROLE_LABEL.student}</Badge>}
          </span>
        }
        actions={<UserActions user={{ ...profile, name: profile.full_name }} isSelf={profile.id === session.user.id} variant="buttons" />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <StatCard
          label="Último acesso"
          value={<span className="text-body">{formatRelative(profile.last_seen_at)}</span>}
          hint={profile.last_seen_at ? formatDateTime(profile.last_seen_at) : undefined}
          strong
        />
        <StatCard label="Acessos" value={formatNumber(profile.access_count)} />
        <StatCard label="Mensagens" value={formatNumber(counts.messages)} />
        <StatCard label="Conversas" value={formatNumber(counts.conversations)} />
        <StatCard label="Áudios" value={formatNumber(counts.audio)} />
        <StatCard label="Anexos" value={formatNumber(counts.files)} />
        <StatCard label="PDFs gerados" value={formatNumber(counts.pdfs)} hint={`${formatNumber(counts.negative)} avaliações negativas`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <SectionTitle
            title="Temas em que mais trava"
            description="Soma dos sinais de dificuldade: pergunta repetida, frases de confusão, avaliação negativa, conversa longa e lacuna do material."
          />
          <Panel className="p-4">
            <RankList
              valueLabel="Pontos de dificuldade por tema"
              items={stuck.map((t) => ({
                key: t.topic,
                label: t.topic,
                value: t.difficulty,
                detail: `${t.questions} ${t.questions === 1 ? "pergunta" : "perguntas"}`,
              }))}
              empty={
                <EmptyState title="Nenhum sinal de dificuldade ainda." className="border-none p-0">
                  {topics.length
                    ? "Ela pergunta, mas sem sinais de que travou em algum tema."
                    : `Os temas aparecem assim que ${pub.ele} começar a conversar com os agentes.`}
                </EmptyState>
              }
            />
          </Panel>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle title="Última dúvida" />
          <Panel className="flex flex-col gap-3 p-4">
            {last ? (
              <>
                <p className="text-body text-ink">{last.question_summary || "Pergunta sem resumo"}</p>
                <div className="flex flex-wrap items-center gap-2 text-meta font-normal text-ink-2">
                  <Badge variant="outline">{last.topic}</Badge>
                  {last.subtopic && <span>{last.subtopic}</span>}
                  <span aria-hidden className="text-ink-4">·</span>
                  <span>{last.agentName}</span>
                  <span aria-hidden className="text-ink-4">·</span>
                  <span>{formatDateTime(last.created_at)}</span>
                </div>
              </>
            ) : (
              <EmptyState title="Nenhuma pergunta registrada ainda." className="border-none p-0">
                A última dúvida aparece aqui depois da primeira conversa.
              </EmptyState>
            )}
          </Panel>

          <SectionTitle title="Vínculos de acesso" className="mt-3" />
          {entitlements.length ? (
            <Panel className="divide-y divide-line">
              {entitlements.map((e, i) => (
                <div key={i} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-ui">
                  <span className="flex items-center gap-2">
                    <Badge variant={i === 0 ? "solid" : "outline"}>{purchaseLabel(e.status)}</Badge>
                    <span className="text-ink-2">{providerLabel(e.provider)}</span>
                  </span>
                  <span className="text-meta font-normal text-ink-3">Atualizado em {formatDateTime(e.updated_at)}</span>
                </div>
              ))}
            </Panel>
          ) : (
            <EmptyState title="Sem vínculo de compra.">Não há compra registrada pela plataforma de pagamento nem liberação manual.</EmptyState>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <SectionTitle
          title="Histórico de perguntas"
          description="As 100 perguntas mais recentes, resumidas pela classificação automática."
        />
        {insights.length === 0 ? (
          <EmptyState title="Nenhuma pergunta registrada ainda.">
            O histórico aparece assim que {pub.ele} começar a conversar com os agentes.
          </EmptyState>
        ) : (
          <DataTable minWidth={820} label="Histórico de perguntas">
            <thead>
              <tr>
                <Th>Data</Th>
                <Th>Pergunta</Th>
                <Th>Tema</Th>
                <Th>Agente</Th>
                <Th align="right">Dificuldade</Th>
              </tr>
            </thead>
            <tbody>
              {insights.map((i) => (
                <Tr key={i.id}>
                  <Td className="whitespace-nowrap text-ink-2">{formatDateTime(i.created_at)}</Td>
                  <Td className="min-w-[280px]">
                    {i.question_summary || <span className="text-ink-3">Sem resumo</span>}
                    {i.is_gap && (
                      <Badge variant="outline" className="ml-2">
                        Lacuna
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    <span className="flex flex-col">
                      <span>{i.topic}</span>
                      {i.subtopic && <span className="text-micro text-ink-3">{i.subtopic}</span>}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap text-ink-2">{i.agentName}</Td>
                  <Td align="right" className={i.difficulty_signal > 0 ? "font-semibold" : "text-ink-3"}>
                    {i.difficulty_signal}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </section>
    </div>
  )
}
