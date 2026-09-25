import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/server"
import { adminRouteGuard, jsonError } from "@/lib/admin/guard"
import { fetchInsights, summarizeTopics } from "@/lib/admin/data"
import { csvResponse, toCsv } from "@/lib/admin/csv"
import { formatDateTime, spDayKey } from "@/lib/admin/format"
import { pub } from "@/config/copy"

/*
 * GET /api/admin/temas/csv?tipo=resumo|lacunas|perguntas&agente=<uuid>
 *   resumo: um tema por linha (perguntas, usuários, dificuldade, lacunas)
 *   lacunas: perguntas que o agente não soube responder
 *   perguntas: todas as perguntas classificadas
 */

const schema = z.object({
  tipo: z.enum(["resumo", "lacunas", "perguntas"]).default("resumo"),
  agente: z.uuid().optional(),
})

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 })

export async function GET(request: Request) {
  const guard = await adminRouteGuard()
  if ("response" in guard) return guard.response

  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!parsed.success) return jsonError("Filtro inválido.")
  const { tipo, agente } = parsed.data

  try {
    const [rows, agents] = await Promise.all([
      fetchInsights(agente),
      createAdminClient().from("agents").select("id, name, slug"),
    ])
    const agentName = new Map((agents.data ?? []).map((a) => [a.id, a.name]))
    const slug = agente ? (agents.data ?? []).find((a) => a.id === agente)?.slug : null
    const suffix = `${slug ? `-${slug}` : ""}-${spDayKey(new Date())}.csv`

    if (tipo === "resumo") {
      const summary = summarizeTopics(rows).sort((a, b) => b.questions - a.questions)
      const csv = toCsv(
        ["Tema", "Perguntas", pub.Varios, "Dificuldade total", "Dificuldade média", "Lacunas", "Última pergunta"],
        summary.map((t) => [
          t.topic,
          t.questions,
          t.students,
          t.difficulty,
          decimal.format(t.avgDifficulty),
          t.gaps,
          formatDateTime(t.lastAskedAt),
        ])
      )
      return csvResponse(`temas${suffix}`, csv)
    }

    const list = tipo === "lacunas" ? rows.filter((r) => r.is_gap) : rows
    const csv = toCsv(
      ["Data", "Agente", "Tema", "Subtema", "Pergunta resumida", "Sinal de dificuldade", "Lacuna"],
      list.map((r) => [
        formatDateTime(r.created_at),
        agentName.get(r.agent_id) ?? "",
        r.topic,
        r.subtopic ?? "",
        r.question_summary ?? "",
        r.difficulty_signal,
        r.is_gap ? "Sim" : "Não",
      ])
    )
    return csvResponse(`${tipo}${suffix}`, csv)
  } catch (err) {
    console.error("[admin/temas/csv]", err)
    return jsonError("Não foi possível gerar o CSV. Tente de novo.", 500)
  }
}
