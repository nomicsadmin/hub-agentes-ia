import { appConfig } from "@/config/app.config"

/*
 * Fuso do app (app.config.ts). Funciona para qualquer fuso, inclusive
 * com horário de verão: calcula a diferença para o UTC na data pedida.
 */

/* Diferença (em minutos) entre o fuso e o UTC num instante. */
function offsetMinutes(at: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value])
  )
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
  return Math.round((asUtc - at.getTime()) / 60000)
}

/* Instante (UTC) da meia-noite de um dia civil "AAAA-MM-DD" no fuso do app. */
export function startOfDay(ymd: string, timeZone: string = appConfig.timeZone) {
  const [y, m, d] = ymd.split("-").map(Number)
  const guess = new Date(Date.UTC(y, m - 1, d))
  return new Date(guess.getTime() - offsetMinutes(guess, timeZone) * 60000)
}

/* "AAAA-MM-DD" de hoje (ou da data) no fuso do app. */
export function dayKey(now = new Date(), timeZone: string = appConfig.timeZone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now)
}

/* Meia-noite de hoje no fuso do app. */
export function startOfToday(now = new Date()) {
  return startOfDay(dayKey(now))
}
