import Link from "next/link"
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr"
import { requireAdmin } from "@/lib/auth/session"
import { listUsers } from "@/lib/admin/data"
import { applyUserQuery, parseUserQuery } from "@/lib/admin/users"
import { formatDateTime, formatNumber, formatRelative } from "@/lib/admin/format"
import { ROLE_LABEL, purchaseLabel } from "@/lib/admin/labels"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable, EmptyState, PageHeader, Td, Th, Tr } from "@/components/admin/primitives"
import { UsersToolbar } from "@/components/admin/users-toolbar"
import { UserActions } from "@/components/admin/user-actions"
import { AddStudentDialog } from "@/components/admin/add-student-dialog"
import { withBase } from "@/lib/base-path"
import { pub, g } from "@/config/copy"

const PER_PAGE = 50

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requireAdmin()
  const params = await searchParams
  const query = parseUserQuery(params)
  const all = await listUsers()
  const rows = applyUserQuery(all, query)

  const pageParam = Number(Array.isArray(params.pagina) ? params.pagina[0] : params.pagina)
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE))
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? Math.min(pageParam, pages) : 1
  const visible = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const qs = new URLSearchParams()
  if (query.q) qs.set("q", query.q)
  if (query.filtro !== "todas") qs.set("filtro", query.filtro)
  if (query.ordem !== "acesso") qs.set("ordem", query.ordem)
  const pageHref = (n: number) => {
    const p = new URLSearchParams(qs)
    if (n > 1) p.set("pagina", String(n))
    const s = p.toString()
    return s ? `/admin/usuarios?${s}` : "/admin/usuarios"
  }
  const csvHref = withBase(`/api/admin/usuarios/csv${qs.toString() ? `?${qs}` : ""}`)
  const filtered = query.q || query.filtro !== "todas"

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={pub.Varios}
        description="Quem tem acesso ao app, quando entrou pela última vez e quanto usa. O status da compra vem do último vínculo com a plataforma de pagamento."
        actions={
          <>
            <a href={csvHref} className={buttonVariants({ variant: "secondary" })} download>
              <DownloadSimpleIcon />
              Exportar CSV
            </a>
            <AddStudentDialog />
          </>
        }
      />

      <UsersToolbar query={query} />

      <p className="text-meta font-normal text-ink-2" aria-live="polite">
        {filtered
          ? `${formatNumber(rows.length)} de ${formatNumber(all.length)} pessoas`
          : `${formatNumber(all.length)} ${all.length === 1 ? "pessoa" : "pessoas"}`}
      </p>

      {all.length === 0 ? (
        <EmptyState title={`${pub.nenhum} ${pub.um} ainda.`} action={<AddStudentDialog />}>
          {pub.Os} {pub.varios} aparecem aqui quando compram (webhook de pagamento) ou quando você adiciona alguém manualmente.
        </EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState title="Ninguém encontrado com esses filtros.">
          Tente outro nome ou e-mail, ou volte o filtro para &quot;{g("Todos", "Todas")}&quot;.
        </EmptyState>
      ) : (
        <DataTable minWidth={1000} label={`Tabela de ${pub.varios}`}>
          <thead>
            <tr>
              <Th>Nome</Th>
              <Th>Último acesso</Th>
              <Th align="right">Acessos</Th>
              <Th align="right">Mensagens</Th>
              <Th>Compra</Th>
              <Th>Acesso</Th>
              <Th>Papel</Th>
              <Th>
                <span className="sr-only">Ações</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => (
              <Tr key={u.id}>
                <Td className="max-w-[280px]">
                  <Link href={`/admin/usuarios/${u.id}`} className="flex min-w-0 flex-col hover:underline">
                    <span className="truncate font-medium text-ink">{u.name || "Sem nome"}</span>
                    <span className="truncate text-meta font-normal text-ink-2">{u.email}</span>
                  </Link>
                </Td>
                <Td>
                  <span className="flex flex-col" title={u.lastSeenAt ? formatDateTime(u.lastSeenAt) : undefined}>
                    <span className="whitespace-nowrap">{formatRelative(u.lastSeenAt)}</span>
                    {u.lastSeenAt && (
                      <span className="text-micro whitespace-nowrap text-ink-3">{formatDateTime(u.lastSeenAt)}</span>
                    )}
                  </span>
                </Td>
                <Td align="right">{formatNumber(u.accessCount)}</Td>
                <Td align="right">{formatNumber(u.messageCount)}</Td>
                <Td>
                  <Badge variant={u.purchaseStatus === "active" || u.purchaseStatus === "manual" ? "default" : "outline"}>
                    {purchaseLabel(u.purchaseStatus)}
                  </Badge>
                </Td>
                <Td>
                  {u.status === "blocked" ? <Badge variant="danger">Bloqueado</Badge> : <Badge>Liberado</Badge>}
                </Td>
                <Td>
                  {u.role === "admin" ? <Badge variant="solid">Admin</Badge> : <span className="text-ink-2">{ROLE_LABEL[u.role] ?? u.role}</span>}
                </Td>
                <Td align="right" className="w-12">
                  <UserActions user={u} isSelf={u.id === session.user.id} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      )}

      {pages > 1 && (
        <nav aria-label="Páginas" className="flex items-center justify-between gap-3">
          <span className="text-meta font-normal text-ink-2 tabular-nums">
            Página {page} de {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Anterior
              </Link>
            ) : null}
            {page < pages ? (
              <Link href={pageHref(page + 1)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Próxima
              </Link>
            ) : null}
          </div>
        </nav>
      )}
    </div>
  )
}
