import { appConfig } from "@/config/app.config"

/*
 * Formatação do admin: datas no fuso do app (app.config.ts), formato brasileiro,
 * números com separador de milhar. Serve para servidor e navegador.
 */

export const TIME_ZONE = appConfig.timeZone

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const timeFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
})

const dayMonthFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
})

/* "2026-09-24" no fuso do app */
const isoDayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const numberFmt = new Intl.NumberFormat("pt-BR")

export function formatNumber(n: number | null | undefined) {
  return numberFmt.format(n ?? 0)
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "Nunca"
  return dateFmt.format(new Date(value))
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "Nunca"
  const d = new Date(value)
  return `${dateFmt.format(d)} às ${timeFmt.format(d)}`
}

export function formatDayMonth(value: string | Date) {
  return dayMonthFmt.format(new Date(value))
}

/* Dia civil no fuso do app, como "2026-09-24". */
export function spDayKey(value: string | Date) {
  return isoDayFmt.format(new Date(value))
}

function dayKeyToUtc(key: string) {
  const [y, m, d] = key.split("-").map(Number)
  return Date.UTC(y, m - 1, d)
}

/* Segunda-feira da semana (no fuso do app) como "2026-09-21". */
export function weekKey(value: string | Date) {
  const utc = dayKeyToUtc(spDayKey(value))
  const dow = new Date(utc).getUTCDay() // 0 = domingo
  const monday = utc - ((dow + 6) % 7) * 86_400_000
  return new Date(monday).toISOString().slice(0, 10)
}

/* As últimas `count` semanas, da mais antiga para a atual. */
export function lastWeeks(count: number, now = new Date()) {
  const current = dayKeyToUtc(weekKey(now))
  return Array.from({ length: count }, (_, i) =>
    new Date(current - (count - 1 - i) * 7 * 86_400_000).toISOString().slice(0, 10)
  )
}

/* "21/09" a partir de "2026-09-21" (sem mexer no fuso). */
export function weekLabel(key: string) {
  const [, m, d] = key.split("-")
  return `${d}/${m}`
}

/* Dias inteiros desde a data (em dias civis no fuso do app). */
export function daysSince(value: string | Date | null | undefined, now = new Date()) {
  if (!value) return null
  return Math.round((dayKeyToUtc(spDayKey(now)) - dayKeyToUtc(spDayKey(value))) / 86_400_000)
}

export function formatRelative(value: string | Date | null | undefined, now = new Date()) {
  const days = daysSince(value, now)
  if (days === null) return "Nunca acessou"
  if (days <= 0) return "Hoje"
  if (days === 1) return "Ontem"
  if (days < 30) return `Há ${days} dias`
  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? "Há 1 mês" : `Há ${months} meses`
  const years = Math.floor(days / 365)
  return years <= 1 ? "Há 1 ano" : `Há ${years} anos`
}

export function plural(n: number, one: string, many: string) {
  return `${formatNumber(n)} ${n === 1 ? one : many}`
}
