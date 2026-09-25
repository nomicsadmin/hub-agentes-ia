import "server-only"
import { createAdminClient } from "@/lib/supabase/server"
import { FULL_CONTEXT_TOKEN_LIMIT } from "@/lib/knowledge/extract"
import { lastWeeks, weekKey } from "./format"
import type { UserRow } from "./users"
import { pub } from "@/config/copy"
import { startOfDay } from "@/lib/time"

/*
 * Leituras do painel admin. Tudo usa a service role (ignora o RLS):
 * só chame depois de requireAdmin() / getAdminSession().
 *
 * O PostgREST devolve no máximo 1000 linhas por pedido, então as
 * listas grandes passam por fetchAll, que pagina com range().
 */

type Db = ReturnType<typeof createAdminClient>
type Result<T> = { data: T[] | null; error: { message: string } | null }
type CountResult = { count: number | null; error: { message: string } | null }

const PAGE = 1000

async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<Result<T>>, max = 100_000) {
  const out: T[] = []
  for (let from = 0; from < max; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < PAGE) break
  }
  return out
}

async function count(query: PromiseLike<CountResult>) {
  const { count: n, error } = await query
  if (error) throw new Error(error.message)
  return n ?? 0
}

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

async function agentNames(db: Db) {
  const agents = must(await db.from("agents").select("id, name, slug, sort").order("sort"))
  return agents
}

/* ── Painel ──────────────────────────────────────────────── */

export async function getDashboardStats() {
  const db = createAdminClient()
  const students = () => db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student")
  const inactiveFor = (days: number) => students().or(`last_seen_at.is.null,last_seen_at.lt.${daysAgo(days)}`)
  const attachments = (kinds: string[]) =>
    db.from("message_attachments").select("id", { count: "exact", head: true }).in("kind", kinds)

  const WEEKS = 12
  const weeks = lastWeeks(WEEKS)

  const [total, active7, blocked, inactive7, inactive15, inactive30, accesses, messages, audio, files, pdfs, negative, weekly] =
    await Promise.all([
      count(students()),
      count(students().gte("last_seen_at", daysAgo(7))),
      count(students().eq("status", "blocked")),
      count(inactiveFor(7)),
      count(inactiveFor(15)),
      count(inactiveFor(30)),
      count(db.from("usage_events").select("id", { count: "exact", head: true }).in("kind", ["open_app", "login"])),
      count(db.from("messages").select("id", { count: "exact", head: true }).eq("role", "user")),
      count(attachments(["audio"])),
      count(attachments(["image", "pdf"])),
      count(attachments(["generated_pdf"])),
      count(db.from("messages").select("id", { count: "exact", head: true }).eq("feedback", -1)),
      fetchAll<{ created_at: string }>((from, to) =>
        db
          .from("messages")
          .select("created_at")
          .eq("role", "user")
          .gte("created_at", startOfDay(weeks[0]).toISOString())
          .order("created_at")
          .range(from, to)
      ),
    ])

  const buckets = new Map(weeks.map((w) => [w, 0]))
  for (const m of weekly) {
    const key = weekKey(m.created_at)
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }

  return {
    total,
    active7,
    blocked,
    inactive7,
    inactive15,
    inactive30,
    accesses,
    messages,
    audio,
    files,
    pdfs,
    negative,
    weekly: weeks.map((week) => ({ week, value: buckets.get(week) ?? 0 })),
  }
}

/* ── Usuários ────────────────────────────────────────────── */

export async function listUsers(): Promise<UserRow[]> {
  const db = createAdminClient()
  const [profiles, messages, entitlements] = await Promise.all([
    fetchAll((from, to) =>
      db
        .from("profiles")
        .select("id, email, full_name, role, status, last_seen_at, access_count, created_at")
        .order("created_at")
        .range(from, to)
    ),
    fetchAll((from, to) =>
      db.from("messages").select("user_id").eq("role", "user").order("id").range(from, to)
    ),
    fetchAll((from, to) =>
      db.from("entitlements").select("user_id, email, status, updated_at").order("id").range(from, to)
    ),
  ])

  const msgCount = new Map<string, number>()
  for (const m of messages) msgCount.set(m.user_id, (msgCount.get(m.user_id) ?? 0) + 1)

  // o vínculo mais recente de cada pessoa (por id; sem id, pelo e-mail)
  const latest = new Map<string, { status: string; updated_at: string }>()
  for (const e of entitlements) {
    const key = e.user_id ?? `email:${e.email.toLowerCase()}`
    const prev = latest.get(key)
    if (!prev || prev.updated_at < e.updated_at) latest.set(key, e)
  }

  return profiles.map((p) => ({
    id: p.id,
    email: p.email,
    name: p.full_name,
    role: p.role,
    status: p.status,
    lastSeenAt: p.last_seen_at,
    accessCount: p.access_count,
    messageCount: msgCount.get(p.id) ?? 0,
    createdAt: p.created_at,
    purchaseStatus: (latest.get(p.id) ?? latest.get(`email:${p.email.toLowerCase()}`))?.status ?? null,
  }))
}

export async function getUserDetail(id: string) {
  const db = createAdminClient()
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id, email, full_name, role, status, last_seen_at, access_count, created_at, accepted_terms_at")
    .eq("id", id)
    .maybeSingle()
  if (profileError) throw new Error(profileError.message)
  if (!profile) return null

  const [entitlements, messages, conversations, negative, attachments, negByQuestion, rawInsights, agents] = await Promise.all([
    db
      .from("entitlements")
      .select("provider, status, product_id, created_at, updated_at")
      .eq("user_id", id)
      .order("updated_at", { ascending: false })
      .then(must),
    count(db.from("messages").select("id", { count: "exact", head: true }).eq("user_id", id).eq("role", "user")),
    count(db.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", id)),
    count(db.from("messages").select("id", { count: "exact", head: true }).eq("user_id", id).eq("feedback", -1)),
    fetchAll((from, to) =>
      db.from("message_attachments").select("kind").eq("user_id", id).order("id").range(from, to)
    ),
    negativeFeedbackByQuestion(db, id),
    fetchAll((from, to) =>
      db
        .from("message_insights")
        .select("id, message_id, agent_id, topic, subtopic, difficulty_signal, is_gap, question_summary, created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .range(from, to)
    ),
    agentNames(db),
  ])

  const agentName = new Map(agents.map((a) => [a.id, a.name]))
  // o 👎 não vem no difficulty_signal: soma aqui na pergunta que gerou a resposta
  const insights = rawInsights.map((i) => ({
    ...i,
    difficulty_signal: i.difficulty_signal + (negByQuestion.get(i.message_id) ?? 0),
  }))

  // mesma agregação da view user_topic_stats, já com o 👎
  const byTopic = new Map<
    string,
    { topic: string; questions: number; difficulty: number; gaps: number; lastAskedAt: string | null; agents: Set<string> }
  >()
  for (const i of insights) {
    const cur = byTopic.get(i.topic) ?? {
      topic: i.topic,
      questions: 0,
      difficulty: 0,
      gaps: 0,
      lastAskedAt: null,
      agents: new Set<string>(),
    }
    cur.questions++
    cur.difficulty += i.difficulty_signal
    if (i.is_gap) cur.gaps++
    if (!cur.lastAskedAt || cur.lastAskedAt < i.created_at) cur.lastAskedAt = i.created_at
    cur.agents.add(agentName.get(i.agent_id) ?? "Agente removido")
    byTopic.set(i.topic, cur)
  }
  const topics = [...byTopic.values()]
    .map((t) => ({ ...t, agents: [...t.agents] }))
    .sort((a, b) => b.difficulty - a.difficulty || b.questions - a.questions)

  const kinds = { audio: 0, files: 0, pdfs: 0 }
  for (const a of attachments) {
    if (a.kind === "audio") kinds.audio++
    else if (a.kind === "generated_pdf") kinds.pdfs++
    else kinds.files++
  }

  return {
    profile,
    entitlements,
    counts: { messages, conversations, negative, ...kinds },
    topics,
    insightTotal: insights.length,
    insights: insights.slice(0, 100).map((i) => ({ ...i, agentName: agentName.get(i.agent_id) ?? "Agente removido" })),
  }
}

/* ── Agentes ─────────────────────────────────────────────── */

export async function listAgentsOverview() {
  const db = createAdminClient()
  const [agents, docs, corrections, prompts] = await Promise.all([
    db.from("agents").select("id, slug, name, description, is_active, sort").order("sort").then(must),
    db
      .from("agent_documents")
      .select("agent_id, document:knowledge_documents(token_estimate, status)")
      .then(must),
    db.from("agent_corrections").select("agent_id").eq("is_active", true).then(must),
    db.from("agent_prompt_versions").select("agent_id, created_at").eq("is_current", true).then(must),
  ])

  return agents.map((a) => {
    const mine = docs.filter((d) => d.agent_id === a.id)
    return {
      ...a,
      documents: mine.length,
      tokens: mine.reduce((sum, d) => sum + (d.document?.token_estimate ?? 0), 0),
      corrections: corrections.filter((c) => c.agent_id === a.id).length,
      promptUpdatedAt: prompts.find((p) => p.agent_id === a.id)?.created_at ?? null,
    }
  })
}

export type AgentDocument = {
  id: string
  title: string
  status: string
  tokenEstimate: number
  mime: string | null
  error: string | null
  priority: number
  updatedAt: string
  sharedWith: string[]
}

export type NegativeFeedback = {
  id: string
  answer: string
  question: string | null
  questionSummary: string | null
  createdAt: string
  userName: string
  conversationTitle: string
  alreadyCorrected: boolean
}

export async function getAgentDetail(id: string) {
  const db = createAdminClient()
  const { data: agent, error: agentError } = await db.from("agents").select("*").eq("id", id).maybeSingle()
  if (agentError) throw new Error(agentError.message)
  if (!agent) return null

  const [versions, corrections, links, allAgents, allDocs, feedback] = await Promise.all([
    db
      .from("agent_prompt_versions")
      .select("id, content, note, is_current, created_by, created_at")
      .eq("agent_id", id)
      .order("created_at", { ascending: false })
      .then(must),
    db
      .from("agent_corrections")
      .select("id, content, is_active, source_message_id, created_by, created_at")
      .eq("agent_id", id)
      .order("created_at", { ascending: false })
      .then(must),
    db
      .from("agent_documents")
      .select(
        "agent_id, document_id, priority, document:knowledge_documents(id, title, status, token_estimate, mime, error, updated_at)"
      )
      .then(must),
    agentNames(db),
    db.from("knowledge_documents").select("id, title, status, token_estimate").order("created_at", { ascending: false }).then(must),
    getNegativeFeedback(db, id),
  ])

  const agentName = new Map(allAgents.map((a) => [a.id, a.name]))
  const documents: AgentDocument[] = links
    .filter((l) => l.agent_id === id && l.document)
    .map((l) => ({
      id: l.document!.id,
      title: l.document!.title,
      status: l.document!.status,
      tokenEstimate: l.document!.token_estimate,
      mime: l.document!.mime,
      error: l.document!.error,
      priority: l.priority,
      updatedAt: l.document!.updated_at,
      sharedWith: links
        .filter((o) => o.document_id === l.document_id && o.agent_id !== id)
        .map((o) => agentName.get(o.agent_id) ?? "Outro agente"),
    }))
    .sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title, "pt-BR"))

  const linked = new Set(documents.map((d) => d.id))
  const available = allDocs.filter((d) => !linked.has(d.id))

  const authorIds = [...new Set([...versions, ...corrections].map((v) => v.created_by).filter(Boolean))] as string[]
  const authors = authorIds.length
    ? must(await db.from("profiles").select("id, full_name, email").in("id", authorIds))
    : []
  const authorName = new Map(authors.map((a) => [a.id, a.full_name || a.email]))

  const totalTokens = documents.reduce((sum, d) => sum + d.tokenEstimate, 0)

  return {
    agent,
    versions: versions.map((v) => ({
      id: v.id,
      content: v.content,
      note: v.note,
      isCurrent: v.is_current,
      createdAt: v.created_at,
      author: v.created_by ? (authorName.get(v.created_by) ?? "Admin removido") : "Sistema",
    })),
    corrections: corrections.map((c) => ({
      id: c.id,
      content: c.content,
      isActive: c.is_active,
      sourceMessageId: c.source_message_id,
      createdAt: c.created_at,
      author: c.created_by ? (authorName.get(c.created_by) ?? "Admin removido") : "Sistema",
    })),
    documents,
    available,
    totalTokens,
    tokenLimit: FULL_CONTEXT_TOKEN_LIMIT,
    feedback: feedback.map((f) => ({
      ...f,
      alreadyCorrected: corrections.some((c) => c.source_message_id === f.id),
    })),
  }
}

async function getNegativeFeedback(db: Db, agentId: string): Promise<Omit<NegativeFeedback, "alreadyCorrected">[]> {
  const rows = must(
    await db
      .from("messages")
      .select("id, content, created_at, conversation_id, user_id, conversations!inner(agent_id, title)")
      .eq("feedback", -1)
      .eq("role", "assistant")
      .eq("conversations.agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(50)
  )
  if (rows.length === 0) return []

  const userIds = [...new Set(rows.map((r) => r.user_id))]
  const [users, questions] = await Promise.all([
    db.from("profiles").select("id, full_name, email").in("id", userIds).then(must),
    // a pergunta é a última mensagem do usuário antes da resposta avaliada
    Promise.all(
      rows.map((r) =>
        db
          .from("messages")
          .select("id, content")
          .eq("conversation_id", r.conversation_id)
          .eq("role", "user")
          .lt("created_at", r.created_at)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) throw new Error(error.message)
            return data
          })
      )
    ),
  ])

  const questionIds = questions.filter(Boolean).map((q) => q!.id)
  const summaries = questionIds.length
    ? must(await db.from("message_insights").select("message_id, question_summary").in("message_id", questionIds))
    : []
  const summaryOf = new Map(summaries.map((s) => [s.message_id, s.question_summary]))
  const userName = new Map(users.map((u) => [u.id, u.full_name || u.email]))

  return rows.map((r, i) => ({
    id: r.id,
    answer: r.content,
    question: questions[i]?.content ?? null,
    questionSummary: questions[i] ? (summaryOf.get(questions[i]!.id) ?? null) : null,
    createdAt: r.created_at,
    userName: userName.get(r.user_id) ?? `${pub.Um} ${pub.removido}`,
    conversationTitle: r.conversations?.title ?? "Conversa",
  }))
}

/* ── Temas e dificuldades ───────────────────────────────── */

export type InsightRow = {
  message_id: string
  agent_id: string
  user_id: string
  topic: string
  subtopic: string | null
  difficulty_signal: number
  is_gap: boolean
  question_summary: string | null
  created_at: string
}

/*
 * Perguntas classificadas, com o 👎 já somado ao difficulty_signal
 * (a classificação grava o sinal antes de o usuário avaliar a resposta).
 */
export async function fetchInsights(agentId?: string): Promise<InsightRow[]> {
  const db = createAdminClient()
  const [rows, negByQuestion] = await Promise.all([
    fetchAll<InsightRow>((from, to) => {
      let q = db
        .from("message_insights")
        .select("message_id, agent_id, user_id, topic, subtopic, difficulty_signal, is_gap, question_summary, created_at")
        .order("created_at", { ascending: false })
        .range(from, to)
      if (agentId) q = q.eq("agent_id", agentId)
      return q
    }),
    negativeFeedbackByQuestion(db),
  ])
  if (negByQuestion.size === 0) return rows
  return rows.map((r) => ({ ...r, difficulty_signal: r.difficulty_signal + (negByQuestion.get(r.message_id) ?? 0) }))
}

/*
 * 👎 por pergunta: cada resposta do agente com feedback -1 vale +1 na
 * última mensagem do usuário antes dela, na mesma conversa. Devolve
 * Map<id da mensagem do usuário, quantidade de 👎>.
 */
async function negativeFeedbackByQuestion(db: Db, userId?: string) {
  const out = new Map<string, number>()
  const negatives = await fetchAll<{ conversation_id: string; created_at: string }>((from, to) => {
    let q = db
      .from("messages")
      .select("conversation_id, created_at")
      .eq("role", "assistant")
      .eq("feedback", -1)
      .order("id")
      .range(from, to)
    if (userId) q = q.eq("user_id", userId)
    return q
  })
  if (negatives.length === 0) return out

  const convIds = [...new Set(negatives.map((n) => n.conversation_id))]
  const questions: { id: string; conversation_id: string; created_at: string }[] = []
  for (let i = 0; i < convIds.length; i += 100) {
    const chunk = convIds.slice(i, i + 100)
    questions.push(
      ...(await fetchAll<{ id: string; conversation_id: string; created_at: string }>((from, to) =>
        db
          .from("messages")
          .select("id, conversation_id, created_at")
          .eq("role", "user")
          .in("conversation_id", chunk)
          .order("created_at")
          .range(from, to)
      ))
    )
  }

  const byConversation = new Map<string, { id: string; t: number }[]>()
  for (const q of questions) {
    const list = byConversation.get(q.conversation_id) ?? []
    list.push({ id: q.id, t: new Date(q.created_at).getTime() })
    byConversation.set(q.conversation_id, list)
  }
  for (const n of negatives) {
    const list = byConversation.get(n.conversation_id)
    if (!list) continue
    const t = new Date(n.created_at).getTime()
    let match: string | null = null
    for (const q of list) {
      if (q.t < t) match = q.id
      else break
    }
    if (match) out.set(match, (out.get(match) ?? 0) + 1)
  }
  return out
}

export type TopicSummary = {
  topic: string
  questions: number
  students: number
  difficulty: number
  avgDifficulty: number
  gaps: number
  lastAskedAt: string
}

export function summarizeTopics(rows: InsightRow[]): TopicSummary[] {
  const map = new Map<string, { questions: number; students: Set<string>; difficulty: number; gaps: number; last: string }>()
  for (const r of rows) {
    const cur = map.get(r.topic) ?? { questions: 0, students: new Set<string>(), difficulty: 0, gaps: 0, last: r.created_at }
    cur.questions++
    cur.students.add(r.user_id)
    cur.difficulty += r.difficulty_signal
    if (r.is_gap) cur.gaps++
    if (cur.last < r.created_at) cur.last = r.created_at
    map.set(r.topic, cur)
  }
  return [...map.entries()].map(([topic, v]) => ({
    topic,
    questions: v.questions,
    students: v.students.size,
    difficulty: v.difficulty,
    avgDifficulty: v.questions ? v.difficulty / v.questions : 0,
    gaps: v.gaps,
    lastAskedAt: v.last,
  }))
}

export async function getTopicsReport(agentId?: string) {
  const db = createAdminClient()
  const WEEKS = 8
  const weeks = lastWeeks(WEEKS)
  const [rows, agents, topicList] = await Promise.all([
    fetchInsights(agentId),
    agentNames(db),
    db.from("topics").select("id, name, sort, is_active").order("sort").order("name").then(must),
  ])

  const summary = summarizeTopics(rows)
  const mostAsked = [...summary].sort((a, b) => b.questions - a.questions).slice(0, 12)
  const hardest = [...summary]
    .filter((t) => t.difficulty > 0)
    .sort((a, b) => b.difficulty - a.difficulty || b.avgDifficulty - a.avgDifficulty)
    .slice(0, 12)

  // evolução: total por semana e os temas mais perguntados semana a semana
  const weekIndex = new Map(weeks.map((w, i) => [w, i]))
  const weeklyTotal = weeks.map(() => 0)
  const topTopics = mostAsked.slice(0, 8).map((t) => t.topic)
  const grid = new Map(topTopics.map((t) => [t, weeks.map(() => 0)]))
  for (const r of rows) {
    const i = weekIndex.get(weekKey(r.created_at))
    if (i === undefined) continue
    weeklyTotal[i]++
    const line = grid.get(r.topic)
    if (line) line[i]++
  }

  // lacunas agrupadas por tema
  const gapMap = new Map<string, { summary: string; subtopic: string | null; createdAt: string; agent: string }[]>()
  const agentName = new Map(agents.map((a) => [a.id, a.name]))
  for (const r of rows) {
    if (!r.is_gap) continue
    const list = gapMap.get(r.topic) ?? []
    list.push({
      summary: r.question_summary || "Pergunta sem resumo",
      subtopic: r.subtopic,
      createdAt: r.created_at,
      agent: agentName.get(r.agent_id) ?? "Agente removido",
    })
    gapMap.set(r.topic, list)
  }
  const gaps = [...gapMap.entries()]
    .map(([topic, items]) => ({ topic, total: items.length, items: items.slice(0, 25) }))
    .sort((a, b) => b.total - a.total)

  return {
    total: rows.length,
    agents,
    topics: topicList,
    mostAsked,
    hardest,
    weeks,
    weeklyTotal,
    grid: topTopics.map((t) => ({ topic: t, values: grid.get(t)! })),
    gaps,
  }
}

/* ── Configurações ──────────────────────────────────────── */

export const DEFAULT_LIMITS = { messages: 150, audio: 20, attachments: 20, pdfs: 15 }
export const DEFAULT_RETENTION_DAYS = 30

export async function getSettings() {
  const db = createAdminClient()
  const rows = must(
    await db.from("app_settings").select("key, value, updated_at").in("key", ["daily_limits", "trash_retention_days"])
  )
  const limitsRow = rows.find((r) => r.key === "daily_limits")
  const retentionRow = rows.find((r) => r.key === "trash_retention_days")
  const raw = (limitsRow?.value ?? {}) as Record<string, unknown>
  const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback)
  return {
    limits: {
      messages: num(raw.messages, DEFAULT_LIMITS.messages),
      audio: num(raw.audio, DEFAULT_LIMITS.audio),
      attachments: num(raw.attachments, DEFAULT_LIMITS.attachments),
      pdfs: num(raw.pdfs, DEFAULT_LIMITS.pdfs),
    },
    retentionDays: num(retentionRow?.value, DEFAULT_RETENTION_DAYS),
    updatedAt: [limitsRow?.updated_at, retentionRow?.updated_at].filter(Boolean).sort().at(-1) ?? null,
  }
}
