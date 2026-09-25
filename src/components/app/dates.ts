import type { ConversationSummary } from "./types"
import { appConfig } from "@/config/app.config"

/* Datas no fuso do app (app.config.ts), como o usuário vê no relógio. */
const TZ = appConfig.timeZone

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })

/* Número do dia (UTC da data local) para comparar calendários. */
function dayNumber(date: Date) {
  const [y, m, d] = dayKeyFmt.format(date).split("-").map(Number)
  return Date.UTC(y, m - 1, d) / 86_400_000
}

export function daysAgo(iso: string, now = new Date()) {
  return dayNumber(now) - dayNumber(new Date(iso))
}

export type ConversationGroup = { label: string; items: ConversationSummary[] }

/* Fixadas no topo; depois Hoje, Ontem, Últimos 7 dias, Mais antigas. */
export function groupConversations(list: ConversationSummary[], now = new Date()): ConversationGroup[] {
  const pinned: ConversationSummary[] = []
  const buckets: Record<string, ConversationSummary[]> = { Hoje: [], Ontem: [], "Últimos 7 dias": [], "Mais antigas": [] }
  for (const c of list) {
    if (c.pinned) {
      pinned.push(c)
      continue
    }
    const diff = daysAgo(c.updated_at, now)
    if (diff <= 0) buckets.Hoje.push(c)
    else if (diff === 1) buckets.Ontem.push(c)
    else if (diff <= 7) buckets["Últimos 7 dias"].push(c)
    else buckets["Mais antigas"].push(c)
  }
  const groups: ConversationGroup[] = []
  if (pinned.length) groups.push({ label: "Fixadas", items: pinned })
  for (const [label, items] of Object.entries(buckets)) if (items.length) groups.push({ label, items })
  return groups
}

const shortFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "short" })
const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })
const longFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" })

/* "14:32", "Ontem", "12 de set.", "12 de set. de 2025" */
export function formatWhen(iso: string, now = new Date()) {
  const date = new Date(iso)
  const diff = daysAgo(iso, now)
  if (diff <= 0) return timeFmt.format(date)
  if (diff === 1) return "Ontem"
  if (dayKeyFmt.format(date).slice(0, 4) === dayKeyFmt.format(now).slice(0, 4)) return shortFmt.format(date)
  return longFmt.format(date)
}

/* Dias que faltam para a lixeira apagar sozinha. */
export function daysLeftInTrash(deletedAt: string, retentionDays: number, now = new Date()) {
  return Math.max(0, retentionDays - daysAgo(deletedAt, now))
}
