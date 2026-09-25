import { USER_FILTERS, USER_SORTS, type UserFilter, type UserSort } from "./labels"

/* Linha da tabela de usuários e filtros (funções puras, sem banco). */

export type UserRow = {
  id: string
  email: string
  name: string | null
  role: string
  status: string
  lastSeenAt: string | null
  accessCount: number
  messageCount: number
  createdAt: string
  purchaseStatus: string | null
}

export type UserQuery = {
  q: string
  filtro: UserFilter
  ordem: UserSort
}

function pick(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function parseUserQuery(params: Record<string, string | string[] | undefined>): UserQuery {
  const q = (pick(params.q) ?? "").trim().slice(0, 120)
  const f = pick(params.filtro)
  const o = pick(params.ordem)
  return {
    q,
    filtro: (USER_FILTERS.some((x) => x.value === f) ? f : "todas") as UserFilter,
    ordem: (USER_SORTS.some((x) => x.value === o) ? o : "acesso") as UserSort,
  }
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

/* Mesma regra do painel: janelas exatas de 24 h contadas a partir de agora. */
function accessedWithin(row: UserRow, days: number, now: Date) {
  if (!row.lastSeenAt) return false
  return new Date(row.lastSeenAt).getTime() >= now.getTime() - days * 86_400_000
}

export function applyUserQuery(rows: UserRow[], query: UserQuery, now = new Date()) {
  const q = normalize(query.q)
  let out = rows.filter((row) => {
    if (q && !normalize(`${row.name ?? ""} ${row.email}`).includes(q)) return false
    switch (query.filtro) {
      case "ativas":
        return accessedWithin(row, 7, now)
      case "bloqueadas":
        return row.status === "blocked"
      case "sem-7":
        return !accessedWithin(row, 7, now)
      case "sem-15":
        return !accessedWithin(row, 15, now)
      case "sem-30":
        return !accessedWithin(row, 30, now)
      case "admins":
        return row.role === "admin"
      default:
        return true
    }
  })

  const time = (v: string | null) => (v ? new Date(v).getTime() : 0)
  out = [...out].sort((a, b) => {
    switch (query.ordem) {
      case "mensagens":
        return b.messageCount - a.messageCount
      case "acessos":
        return b.accessCount - a.accessCount
      case "nome":
        return (a.name || a.email).localeCompare(b.name || b.email, "pt-BR")
      case "recentes":
        return time(b.createdAt) - time(a.createdAt)
      default:
        return time(b.lastSeenAt) - time(a.lastSeenAt)
    }
  })
  return out
}
