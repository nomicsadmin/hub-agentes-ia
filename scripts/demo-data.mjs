/*
 * DADOS FICTÍCIOS PARA VER O PAINEL CHEIO (só para testes e prints)
 *
 *   npm run demo:dados            cria 12 pessoas fictícias com uso nas últimas semanas
 *   npm run demo:dados -- --agente=meu-agente   usa esse agente nas conversas fictícias
 *   npm run demo:dados -- --limpar apaga tudo o que este script criou
 *
 * Todas as contas usam o domínio demo.example.com (não recebe e-mail) e
 * são criadas já confirmadas, sem disparar convite. Use num projeto de
 * teste; se rodar em produção, limpe depois com --limpar.
 */
import { c, fail, supabaseAdmin } from "./lib/env.mjs"

const DOMAIN = "demo.example.com"
const CLEAN = process.argv.includes("--limpar")
const supabase = await supabaseAdmin()

const PEOPLE = [
  "Ana Exemplo", "João Teste", "Marina Demo", "Carlos Fictício", "Beatriz Amostra", "Rafael Modelo",
  "Juliana Protótipo", "Pedro Simulado", "Camila Ensaio", "Lucas Rascunho", "Fernanda Piloto", "Diego Esboço",
]

const QUESTIONS = [
  { topic: "Primeiros passos", q: "Por onde eu começo o método?", a: "Comece pelo Passo 1 · Clareza: escreva em uma frase o resultado que você quer." },
  { topic: "Conceitos do método", q: "Qual a diferença entre Ação e Revisão?", a: "Ação é executar tarefas de até 2 horas; Revisão compara o resultado com a frase do passo 1." },
  { topic: "Aplicação prática", q: "Como divido meu projeto em tarefas?", a: "Quebre em tarefas de no máximo 2 horas e faça pelo menos 1 por dia útil." },
  { topic: "Prazos e cronograma", q: "Quanto tempo leva um ciclo?", a: "Um ciclo leva 30 dias." },
  { topic: "Aplicação prática", q: "Não entendi como revisar sem recomeçar", a: "Revisar não é recomeçar: anote 3 aprendizados e 1 ajuste e siga." },
  { topic: "Conceitos do método", q: "O que é o Relatório Z?", a: "Isso não está no material." },
]

async function listDemoUsers() {
  const { data, error } = await supabase.from("profiles").select("id, email").like("email", `%@${DOMAIN}`)
  if (error) fail(`Lendo perfis: ${error.message}`, "As migrations foram aplicadas? (npx supabase db push)")
  return data
}

if (CLEAN) {
  const users = await listDemoUsers()
  for (const u of users) await supabase.auth.admin.deleteUser(u.id)
  console.log(c.ok(`${users.length} conta(s) fictícia(s) removida(s), com conversas e métricas.`))
  process.exit(0)
}

// agente usado nas conversas fictícias: --agente=<slug>, senão o agente-exemplo, senão o primeiro
const argSlug = process.argv.find((a) => a.startsWith("--agente="))?.split("=")[1]
const { data: agents } = await supabase.from("agents").select("id, name, slug").order("sort")
const agent =
  agents?.find((a) => a.slug === (argSlug ?? "agente-exemplo")) ?? (argSlug ? null : agents?.[0])
if (!agent) fail(argSlug ? `Agente "${argSlug}" não encontrado.` : "Nenhum agente no banco.", "Rode `npm run agentes:sync` antes.")

const day = 86400000
const now = Date.now()
const rand = (n) => Math.floor(Math.random() * n)
let created = 0

for (const [i, name] of PEOPLE.entries()) {
  const email = `${name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, ".")}@${DOMAIN}`
  let userId = (await listDemoUsers()).find((u) => u.email === email)?.id
  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: name } })
    if (error) fail(`Criando ${email}: ${error.message}`)
    userId = data.user.id
    created++
  }

  // atividade: uns ativos, uns sumidos há 10, 20, 40 dias
  const lastSeenDaysAgo = [0, 1, 2, 3, 5, 6, 9, 12, 18, 25, 35, 45][i]
  const lastSeen = new Date(now - lastSeenDaysAgo * day)
  const visits = 3 + rand(25)
  await supabase.from("profiles").update({ full_name: name, last_seen_at: lastSeen.toISOString(), access_count: visits }).eq("id", userId)
  await supabase.from("entitlements").upsert(
    { user_id: userId, email, provider: "manual", status: "manual", external_id: `demo-${userId}` },
    { onConflict: "provider,external_id" }
  )

  const events = []
  for (let k = 0; k < visits; k++) {
    const at = new Date(lastSeen.getTime() - rand(70) * day).toISOString()
    events.push({ user_id: userId, kind: k % 3 ? "open_app" : "login", created_at: at })
  }

  // uma conversa com 2 a 4 perguntas
  const { data: conv } = await supabase
    .from("conversations")
    .insert({ user_id: userId, agent_id: agent.id, title: QUESTIONS[i % QUESTIONS.length].q.slice(0, 40), updated_at: lastSeen.toISOString() })
    .select("id")
    .single()
  const n = 2 + rand(3)
  for (let k = 0; k < n; k++) {
    const item = QUESTIONS[(i + k) % QUESTIONS.length]
    const at = new Date(lastSeen.getTime() - (n - k) * 3600000 - rand(40) * day)
    const { data: um } = await supabase
      .from("messages")
      .insert({ conversation_id: conv.id, user_id: userId, role: "user", content: item.q, created_at: at.toISOString() })
      .select("id")
      .single()
    await supabase.from("messages").insert({
      conversation_id: conv.id,
      user_id: userId,
      role: "assistant",
      content: item.a,
      feedback: item.a.startsWith("Isso não está") ? -1 : rand(4) === 0 ? 1 : null,
      created_at: new Date(at.getTime() + 20000).toISOString(),
    })
    const confused = /não entendi/i.test(item.q)
    await supabase.from("message_insights").insert({
      message_id: um.id,
      user_id: userId,
      agent_id: agent.id,
      topic: item.topic,
      difficulty_signal: (confused ? 2 : 0) + (k > 1 ? 1 : 0) + (item.a.startsWith("Isso não está") ? 1 : 0),
      is_gap: item.a.startsWith("Isso não está"),
      question_summary: item.q,
      created_at: at.toISOString(),
    })
    events.push({ user_id: userId, kind: "message", created_at: at.toISOString() })
  }
  await supabase.from("usage_events").insert(events)
}

console.log(c.ok(`Dados fictícios prontos: ${PEOPLE.length} pessoas (${created} novas) em @${DOMAIN}.`))
console.log(c.dim("Abra /admin para ver o painel cheio. Para apagar: npm run demo:dados -- --limpar"))
