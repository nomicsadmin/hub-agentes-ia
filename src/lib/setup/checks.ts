/*
 * CHECAGENS DE INSTALAÇÃO
 * Usadas pela página /setup, por `npm run setup` e por `npm run diagnostico`.
 * Regras deste arquivo:
 *  - só dependências npm, sem imports internos (o Node roda direto nos scripts);
 *  - nunca devolve o VALOR de uma variável, só se existe e se funciona;
 *  - toda mensagem passa por redact() antes de sair.
 */
import { createClient } from "@supabase/supabase-js"

export type CheckStatus = "ok" | "fail" | "warn" | "skip"

export type Check = {
  id: string
  step: number
  title: string
  status: CheckStatus
  detail: string
  /** o que fazer para resolver (comando ou caminho) */
  fix?: string
  /** doc do passo a passo */
  doc?: string
}

const SECRET_VARS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "OPENAI_API_KEY",
  "HUBLA_WEBHOOK_TOKEN",
  "CRON_SECRET",
  "SUPABASE_DB_PASSWORD",
]

/* Troca qualquer segredo, token, e-mail ou endereço de projeto por [OCULTO]. */
export function redact(text: string, env: Record<string, string | undefined> = process.env) {
  let out = text
  for (const name of SECRET_VARS) {
    const v = env[name]
    if (v && v.length >= 8) out = out.split(v).join(`[OCULTO:${name}]`)
  }
  return out
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, "[OCULTO:JWT]")
    .replace(/\b(sk|sbp|sb_secret|sb_publishable)[-_][A-Za-z0-9_-]{8,}/g, "[OCULTO:CHAVE]")
    .replace(/https?:\/\/[a-z0-9]{15,}\.supabase\.co/gi, "https://[OCULTO].supabase.co")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[OCULTO:EMAIL]")
}

const has = (v: string | undefined) => !!v && v.trim() !== ""

const REQUIRED_TABLES = ["profiles", "agents", "agent_prompt_versions", "knowledge_documents", "topics", "app_settings", "webhook_events"]
const REQUIRED_BUCKETS = ["chat-uploads", "generated", "knowledge"]

export async function runChecks(options: { env?: Record<string, string | undefined>; online?: boolean } = {}): Promise<Check[]> {
  const env = options.env ?? process.env
  const online = options.online ?? true
  const checks: Check[] = []
  const add = (c: Check) => checks.push({ ...c, detail: redact(c.detail, env), fix: c.fix && redact(c.fix, env) })

  /* 0. Node */
  if (typeof process !== "undefined" && process.versions?.node) {
    const [maj, min] = process.versions.node.split(".").map(Number)
    const okNode = maj > 22 || (maj === 22 && min >= 18)
    add({
      id: "node",
      step: 2,
      title: "Node.js 22.18 ou mais novo",
      status: okNode ? "ok" : "fail",
      detail: `Versão instalada: ${process.versions.node}`,
      fix: okNode ? undefined : "Instale o Node.js LTS em https://nodejs.org e abra o terminal de novo.",
      doc: "docs/02-pre-requisitos.md",
    })
  }

  /* 1. Variáveis do Supabase */
  const supaVars = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]
  const missingSupa = supaVars.filter((n) => !has(env[n]))
  add({
    id: "env-supabase",
    step: 3,
    title: "Chaves do Supabase no .env.local",
    status: missingSupa.length ? "fail" : "ok",
    detail: missingSupa.length ? `Faltando: ${missingSupa.join(", ")}` : "URL, chave pública e service role preenchidas.",
    fix: missingSupa.length
      ? "Rode `npm run setup` (ele pergunta e grava) ou copie de Supabase > Project Settings > API para o .env.local."
      : undefined,
    doc: "docs/03-supabase.md",
  })

  /* 2. Conexão, tabelas, buckets, admin, agentes */
  if (!missingSupa.length && online) {
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    let connected = false
    const missingTables: string[] = []
    let connError = ""
    for (const table of REQUIRED_TABLES) {
      const { error } = await supabase.from(table).select("*", { count: "exact", head: true })
      if (!error) {
        connected = true
        continue
      }
      if (error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message)) {
        connected = true
        missingTables.push(table)
      } else {
        connError = `${error.code ?? ""} ${error.message}`.trim()
        break
      }
    }

    add({
      id: "supabase-conexao",
      step: 3,
      title: "Conexão com o Supabase",
      status: connected ? "ok" : "fail",
      detail: connected ? "O servidor conversa com o seu projeto." : `Falhou: ${connError || "sem resposta"}`,
      fix: connected ? undefined : "Confira a URL e a SERVICE_ROLE_KEY (sem espaços ou aspas) e se o projeto não está pausado no painel do Supabase.",
      doc: "docs/03-supabase.md",
    })

    if (connected) {
      // cadastro público ligado = qualquer pessoa cria conta e entra sem pagar
      try {
        const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
          headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
        })
        const settings = res.ok ? ((await res.json()) as { disable_signup?: boolean }) : null
        add({
          id: "cadastro-fechado",
          step: 3,
          title: "Cadastro público desligado",
          status: settings?.disable_signup ? "ok" : "fail",
          detail: settings
            ? settings.disable_signup
              ? "Só entra quem comprou ou quem o admin convidou."
              : "O cadastro está ABERTO: qualquer pessoa pode criar conta e usar os agentes de graça."
            : `Não consegui ler as configurações de login (${res.status}).`,
          fix: settings?.disable_signup
            ? undefined
            : 'Supabase > Authentication > Sign In / Providers > desligue "Allow new users to sign up" e salve.',
          doc: "docs/03-supabase.md",
        })
      } catch {
        /* sem rede: a checagem de conexão já mostra o problema */
      }

      add({
        id: "migrations",
        step: 3,
        title: "Tabelas criadas (migrations)",
        status: missingTables.length ? "fail" : "ok",
        detail: missingTables.length ? `Faltam tabelas: ${missingTables.join(", ")}` : "Todas as tabelas do app existem.",
        fix: missingTables.length ? "Rode `npx supabase link` e depois `npx supabase db push`." : undefined,
        doc: "docs/03-supabase.md",
      })

      const { data: buckets, error: bErr } = await supabase.storage.listBuckets()
      const names = new Set((buckets ?? []).map((b) => b.id))
      const missingBuckets = REQUIRED_BUCKETS.filter((b) => !names.has(b))
      add({
        id: "buckets",
        step: 3,
        title: "Armazenamento de arquivos (buckets)",
        status: bErr ? "fail" : missingBuckets.length ? "fail" : "ok",
        detail: bErr ? `Falhou: ${bErr.message}` : missingBuckets.length ? `Faltam: ${missingBuckets.join(", ")}` : "chat-uploads, generated e knowledge prontos.",
        fix: bErr || missingBuckets.length ? "Os buckets são criados pelas migrations: rode `npx supabase db push`." : undefined,
        doc: "docs/03-supabase.md",
      })

      if (!missingTables.length) {
        const { count: admins } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin")
        add({
          id: "admin",
          step: 5,
          title: "Primeiro admin criado",
          status: (admins ?? 0) > 0 ? "ok" : "fail",
          detail: (admins ?? 0) > 0 ? `${admins} admin(s).` : "Ainda não existe nenhum admin.",
          fix: (admins ?? 0) > 0 ? undefined : 'Rode `npm run admin:criar -- seu@email.com "Seu Nome"` e abra o link que aparecer.',
          doc: "docs/05-rodar-local.md",
        })

        const { data: agents } = await supabase.from("agents").select("id, slug, is_active")
        const { data: prompts } = await supabase.from("agent_prompt_versions").select("agent_id").eq("is_current", true)
        const { data: docs } = await supabase.from("agent_documents").select("agent_id, knowledge_documents(status)")
        const withPrompt = new Set((prompts ?? []).map((p) => p.agent_id))
        const withDoc = new Set(
          (docs ?? [])
            .filter((d) => (d.knowledge_documents as unknown as { status: string } | null)?.status === "ready")
            .map((d) => d.agent_id)
        )
        const ready = (agents ?? []).filter((a) => a.is_active && withPrompt.has(a.id) && withDoc.has(a.id))
        add({
          id: "agentes",
          step: 7,
          title: "Pelo menos 1 agente com prompt e material",
          status: ready.length ? "ok" : (agents ?? []).length ? "warn" : "fail",
          detail: ready.length
            ? `Prontos: ${ready.map((a) => a.slug).join(", ")}`
            : (agents ?? []).length
              ? "Há agentes, mas sem prompt ou sem documento pronto."
              : "Nenhum agente no banco.",
          fix: ready.length ? undefined : "Rode `npm run agentes:sync` (lê a pasta agentes/).",
          doc: "docs/07-inteligencia-e-agentes.md",
        })
      }
    }
  }

  /* 3. OpenAI */
  const missingAi = ["OPENAI_API_KEY", "OPENAI_MODEL"].filter((n) => !has(env[n]))
  add({
    id: "env-openai",
    step: 4,
    title: "Chave e modelo da OpenAI",
    status: missingAi.length ? "fail" : "ok",
    detail: missingAi.length ? `Faltando: ${missingAi.join(", ")}` : `Modelo do chat: ${env.OPENAI_MODEL}`,
    fix: missingAi.length ? "Crie a chave em platform.openai.com > API keys e rode `npm run setup`." : undefined,
    doc: "docs/04-openai.md",
  })

  if (!missingAi.length && online) {
    try {
      const res = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(env.OPENAI_MODEL!)}`, {
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      })
      const status = res.status
      add({
        id: "openai-modelo",
        step: 4,
        title: "OpenAI responde com esse modelo",
        status: res.ok ? "ok" : "fail",
        detail: res.ok
          ? "Chave válida e modelo disponível na sua conta."
          : status === 401
            ? "A chave foi recusada (401)."
            : status === 404
              ? `O modelo "${env.OPENAI_MODEL}" não existe ou não está liberado na sua conta (404).`
              : `A OpenAI respondeu ${status}.`,
        fix: res.ok
          ? undefined
          : status === 401
            ? "Gere uma chave nova e cole no .env.local (sem espaços)."
            : status === 404
              ? "Troque OPENAI_MODEL por um modelo que aparece em platform.openai.com > Models."
              : "Confira se há crédito em platform.openai.com > Billing.",
        doc: "docs/04-openai.md",
      })
    } catch (err) {
      add({
        id: "openai-modelo",
        step: 4,
        title: "OpenAI responde com esse modelo",
        status: "fail",
        detail: `Sem conexão com a OpenAI: ${err instanceof Error ? err.message : String(err)}`,
        fix: "Confira a internet ou um firewall/proxy da empresa.",
        doc: "docs/04-openai.md",
      })
    }
  }

  add({
    id: "transcricao",
    step: 4,
    title: "Mensagens de áudio (transcrição)",
    status: has(env.OPENAI_TRANSCRIBE_MODEL) ? "ok" : "warn",
    detail: has(env.OPENAI_TRANSCRIBE_MODEL)
      ? `Modelo de transcrição: ${env.OPENAI_TRANSCRIBE_MODEL}`
      : "OPENAI_TRANSCRIBE_MODEL vazio: o botão de áudio avisa que está indisponível.",
    fix: has(env.OPENAI_TRANSCRIBE_MODEL) ? undefined : "Preencha OPENAI_TRANSCRIBE_MODEL no .env.local (veja docs/04-openai.md).",
    doc: "docs/04-openai.md",
  })

  /* 4. Endereço e rotinas */
  add({
    id: "site-url",
    step: 5,
    title: "Endereço do app (convites e senha)",
    status: has(env.NEXT_PUBLIC_SITE_URL) ? "ok" : "warn",
    detail: has(env.NEXT_PUBLIC_SITE_URL) ? `NEXT_PUBLIC_SITE_URL = ${env.NEXT_PUBLIC_SITE_URL}` : "Vazio: os e-mails de convite podem apontar para o lugar errado.",
    fix: has(env.NEXT_PUBLIC_SITE_URL) ? undefined : "Local: http://localhost:3000. Em produção: o seu domínio (https://...).",
    doc: "docs/09-deploy-vercel.md",
  })
  add({
    id: "cron",
    step: 8,
    title: "Segredo da rotina diária (lixeira)",
    status: (env.CRON_SECRET ?? "").length >= 16 ? "ok" : "warn",
    detail: (env.CRON_SECRET ?? "").length >= 16 ? "CRON_SECRET preenchido." : "CRON_SECRET vazio ou curto: a limpeza automática da lixeira não roda.",
    fix: (env.CRON_SECRET ?? "").length >= 16 ? undefined : "`npm run setup` gera um para você.",
    doc: "docs/09-deploy-vercel.md",
  })

  /* 5. Pagamento (opcional) */
  add({
    id: "pagamento",
    step: 8,
    title: "Venda automática por webhook (opcional)",
    status: has(env.HUBLA_WEBHOOK_TOKEN) ? "ok" : "skip",
    detail: has(env.HUBLA_WEBHOOK_TOKEN)
      ? "Token da Hubla configurado: /api/webhooks/hubla ativo."
      : "Sem token de pagamento: acesso só por convite do admin (funciona normalmente).",
    fix: has(env.HUBLA_WEBHOOK_TOKEN) ? undefined : "Quando for vender: docs/08-pagamento.md.",
    doc: "docs/08-pagamento.md",
  })

  return checks.sort((a, b) => a.step - b.step)
}

/* Pedido pronto para colar numa IA quando uma checagem falha (sem segredos). */
export function helpPrompt(check: Check) {
  return [
    "Estou instalando o template \"Hub de Agentes de IA\" (Next.js + Supabase + OpenAI) e travei numa etapa.",
    "",
    `Etapa: ${check.title} (passo ${check.step})`,
    `Resultado da checagem: ${check.detail}`,
    check.fix ? `Sugestão do assistente: ${check.fix}` : "",
    check.doc ? `Guia do projeto: ${check.doc}` : "",
    "",
    "Me explique a causa em linguagem simples e me diga o passo exato para resolver.",
    "Importante: não me peça para colar chaves, tokens ou o .env.local inteiro aqui.",
  ]
    .filter((l) => l !== "")
    .join("\n")
}
