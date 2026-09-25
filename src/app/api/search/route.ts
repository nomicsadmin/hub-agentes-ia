import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { getActiveUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

/*
 * GET /api/search?q=
 * Full-text em português (conversations.fts, messages.fts e
 * message_attachments.fts: título, mensagens, transcrição de áudio e
 * nome de arquivo). Cliente com a sessão do usuário: o RLS só devolve o
 * que é dela. Busca por prefixo ("lanç" acha "lançamento").
 * Resposta: { results: [{ id, title, updated_at, archived, snippet }] }
 */

export const dynamic = "force-dynamic"

const querySchema = z.string().trim().min(2, "Digite pelo menos 2 letras.").max(200, "Busca longa demais.")

type Hit = { id: string; title: string; updated_at: string; archived: boolean; snippet: string | null; score: number }

/* Termos viram prefixos em tsquery: "verba capta" -> "verba:* & capta:*" */
function toTsQuery(q: string) {
  const words = q
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((w) => w.length > 0)
    .slice(0, 8)
  return words.length ? words.map((w) => `${w}:*`).join(" & ") : null
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

/* Trecho de ~160 caracteres em volta do primeiro termo encontrado. */
function snippet(text: string | null | undefined, q: string) {
  if (!text) return null
  const clean = text.replace(/[#*_`>|]+/g, " ").replace(/\s+/g, " ").trim()
  const folded = fold(clean)
  const terms = fold(q).split(/\s+/).filter((t) => t.length > 1)
  let at = -1
  for (const t of terms) {
    const i = folded.indexOf(t)
    if (i !== -1 && (at === -1 || i < at)) at = i
  }
  if (at === -1) return clean.slice(0, 160) + (clean.length > 160 ? "…" : "")
  const start = Math.max(0, at - 60)
  const end = Math.min(clean.length, at + 100)
  return (start > 0 ? "…" : "") + clean.slice(start, end).trim() + (end < clean.length ? "…" : "")
}

export async function GET(request: NextRequest) {
  const session = await getActiveUser()
  if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 })

  const parsed = querySchema.safeParse(request.nextUrl.searchParams.get("q") ?? "")
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Busca inválida." }, { status: 400 })
  const q = parsed.data
  const tsq = toTsQuery(q)
  if (!tsq) return NextResponse.json({ results: [] })

  const supabase = await createClient()
  const search = { config: "portuguese" } as const

  const [convs, msgs, atts] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, title, updated_at, archived_at")
      .is("deleted_at", null)
      .textSearch("fts", tsq, search)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("messages")
      .select("content, created_at, conversations!inner(id, title, updated_at, archived_at, deleted_at)")
      .is("conversations.deleted_at", null)
      .textSearch("fts", tsq, search)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("message_attachments")
      .select("title, transcript, messages!inner(conversations!inner(id, title, updated_at, archived_at, deleted_at))")
      .is("messages.conversations.deleted_at", null)
      .textSearch("fts", tsq, search)
      .limit(30),
  ])

  if (convs.error || msgs.error || atts.error) {
    console.error("[search] falha:", convs.error?.code ?? msgs.error?.code ?? atts.error?.code)
    return NextResponse.json({ error: "Não foi possível buscar agora." }, { status: 500 })
  }

  const hits = new Map<string, Hit>()
  const add = (
    c: { id: string; title: string; updated_at: string; archived_at: string | null },
    text: string | null,
    score: number
  ) => {
    const existing = hits.get(c.id)
    if (existing) {
      existing.score += score
      if (!existing.snippet && text) existing.snippet = snippet(text, q)
      return
    }
    hits.set(c.id, {
      id: c.id,
      title: c.title,
      updated_at: c.updated_at,
      archived: !!c.archived_at,
      snippet: text ? snippet(text, q) : null,
      score,
    })
  }

  for (const c of convs.data ?? []) add(c, null, 3)
  for (const m of msgs.data ?? []) if (m.conversations) add(m.conversations, m.content, 1)
  for (const a of atts.data ?? []) {
    const c = a.messages?.conversations
    if (c) add(c, a.transcript || a.title, 1)
  }

  const results = [...hits.values()]
    .sort((a, b) => b.score - a.score || b.updated_at.localeCompare(a.updated_at))
    .slice(0, 25)
    .map(({ score: _score, ...rest }) => rest) // eslint-disable-line @typescript-eslint/no-unused-vars

  return NextResponse.json({ results }, { headers: { "Cache-Control": "private, no-store" } })
}
