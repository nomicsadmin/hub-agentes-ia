import "server-only"
import { createAdminClient } from "@/lib/supabase/server"
import type { Json } from "@/lib/supabase/types"
import { startOfToday } from "@/lib/time"

/*
 * Limites diários por usuário (app_settings.daily_limits, editável no admin)
 * contados em usage_events desde a meia-noite (fuso de app.config.ts).
 * Chamar só depois de validar o usuário (usa a service role).
 */

export type LimitKind = "messages" | "audio" | "attachments" | "pdfs"
type EventKind = "message" | "audio" | "attachment" | "pdf"

const EVENT_FOR_LIMIT: Record<LimitKind, EventKind> = {
  messages: "message",
  audio: "audio",
  attachments: "attachment",
  pdfs: "pdf",
}

const DEFAULT_LIMITS: Record<LimitKind, number> = { messages: 150, audio: 20, attachments: 20, pdfs: 15 }

const LIMIT_MESSAGES: Record<LimitKind, (n: number) => string> = {
  messages: (n) => `Você chegou ao limite de ${n} mensagens por hoje. Amanhã você pode continuar.`,
  audio: (n) => `Você chegou ao limite de ${n} áudios por hoje. Escreva a sua pergunta ou tente amanhã.`,
  attachments: (n) => `Você chegou ao limite de ${n} anexos por hoje. Amanhã você pode enviar mais.`,
  pdfs: (n) => `Você chegou ao limite de ${n} PDFs gerados por hoje. Amanhã você pode gerar mais.`,
}

/* Meia-noite de hoje no fuso do app. */
export function startOfTodayLocal(now = new Date()) {
  return startOfToday(now)
}

export async function getDailyLimits(): Promise<Record<LimitKind, number>> {
  const admin = createAdminClient()
  const { data } = await admin.from("app_settings").select("value").eq("key", "daily_limits").maybeSingle()
  const value = (data?.value ?? {}) as Record<string, unknown>
  const out = { ...DEFAULT_LIMITS }
  for (const key of Object.keys(out) as LimitKind[]) {
    const n = Number(value[key])
    if (Number.isFinite(n) && n >= 0) out[key] = n
  }
  return out
}

export async function countToday(userId: string, kind: EventKind) {
  const admin = createAdminClient()
  let query = admin
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", kind)
    .gte("created_at", startOfTodayLocal().toISOString())
  // o limite de PDFs vale para os gerados pelo agente; o botão "Baixar em PDF" não consome
  if (kind === "pdf") query = query.eq("meta->>source", "tool")
  const { count } = await query
  return count ?? 0
}

/* null = pode seguir; string = mensagem amigável de limite atingido. */
export async function checkDailyLimit(userId: string, limit: LimitKind, adding = 1): Promise<string | null> {
  const [limits, used] = await Promise.all([getDailyLimits(), countToday(userId, EVENT_FOR_LIMIT[limit])])
  const max = limits[limit]
  if (used + adding > max) return LIMIT_MESSAGES[limit](max)
  return null
}

export async function recordUsage(userId: string, kind: EventKind, meta?: Json) {
  const admin = createAdminClient()
  const { error } = await admin.from("usage_events").insert({ user_id: userId, kind, meta: meta ?? null })
  if (error) console.error(`[usage] falha ao registrar ${kind}: ${error.code}`)
}
