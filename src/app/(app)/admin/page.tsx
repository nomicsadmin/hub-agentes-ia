import Link from "next/link"
import { requireAdmin } from "@/lib/auth/session"
import { getDashboardStats } from "@/lib/admin/data"
import { formatNumber, weekLabel } from "@/lib/admin/format"
import { EmptyState, PageHeader, Panel, SectionTitle, StatCard, WeekBars } from "@/components/admin/primitives"
import { pub, g } from "@/config/copy"

export default async function AdminDashboardPage() {
  await requireAdmin()
  const s = await getDashboardStats()
  const pct = (n: number) => (s.total ? `${Math.round((n / s.total) * 100)}% ${pub.dos} ${pub.varios}` : `Sem ${pub.varios} ainda`)
  const weekTotal = s.weekly.reduce((sum, w) => sum + w.value, 0)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Painel"
        description={`Engajamento ${pub.dos} ${pub.varios}. Os números contam só quem tem papel de ${pub.um}.`}
      />

      <section className="flex flex-col gap-3">
        <SectionTitle title={pub.Varios} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label={`Total de ${pub.varios}`} value={formatNumber(s.total)} hint={`${formatNumber(s.blocked)} ${g("bloqueados", "bloqueadas")}`} strong />
          <StatCard label={g("Ativos", "Ativas")} value={formatNumber(s.active7)} hint={`Acessaram nos últimos 7 dias · ${pct(s.active7)}`} />
          <Link href="/admin/usuarios?filtro=sem-7" className="rounded-control transition-colors hover:bg-hover">
            <StatCard label="Sem acesso há 7 dias" value={formatNumber(s.inactive7)} hint="Inclui quem nunca entrou" />
          </Link>
          <Link href="/admin/usuarios?filtro=sem-15" className="rounded-control transition-colors hover:bg-hover">
            <StatCard label="Sem acesso há 15 dias" value={formatNumber(s.inactive15)} hint="Inclui quem nunca entrou" />
          </Link>
          <Link href="/admin/usuarios?filtro=sem-30" className="rounded-control transition-colors hover:bg-hover">
            <StatCard label="Sem acesso há 30 dias" value={formatNumber(s.inactive30)} hint="Inclui quem nunca entrou" />
          </Link>
          <StatCard label="Total de acessos" value={formatNumber(s.accesses)} hint="Logins e aberturas do app" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle title="Uso" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Mensagens" value={formatNumber(s.messages)} hint="Perguntas enviadas aos agentes" strong />
          <StatCard label="Áudios" value={formatNumber(s.audio)} hint="Mensagens gravadas e transcritas" />
          <StatCard label="Anexos" value={formatNumber(s.files)} hint="PDFs e imagens enviados" />
          <StatCard label="PDFs gerados" value={formatNumber(s.pdfs)} hint="Documentos montados pelos agentes" />
          <Link href="/admin/agentes" className="rounded-control transition-colors hover:bg-hover">
            <StatCard label="Avaliações negativas" value={formatNumber(s.negative)} hint="Revise na aba Avaliações do agente" />
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle
          title="Mensagens por semana"
          description="Últimas 12 semanas, de segunda a domingo. A barra escura é a semana atual."
        />
        <Panel className="p-4 md:p-5">
          {weekTotal === 0 ? (
            <EmptyState title="Nenhuma mensagem nas últimas 12 semanas.">
              O gráfico aparece assim que {pub.os} {pub.varios} começarem a conversar com os agentes.
            </EmptyState>
          ) : (
            <WeekBars
              label="Mensagens por semana"
              unit={["mensagem", "mensagens"]}
              data={s.weekly.map((w) => ({ label: weekLabel(w.week), value: w.value }))}
            />
          )}
        </Panel>
      </section>
    </div>
  )
}
