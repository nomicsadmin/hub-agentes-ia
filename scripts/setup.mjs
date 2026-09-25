/*
 * ASSISTENTE DE INSTALAÇÃO NO TERMINAL
 *
 *   npm run setup            pergunta o que falta, grava o .env.local e confere tudo
 *   npm run setup -- --check só confere (não pergunta nada)
 *
 * As chaves são digitadas aqui, no SEU terminal, e gravadas só no .env.local
 * (que nunca vai para o GitHub). Nada é enviado para lugar nenhum além do
 * próprio Supabase/OpenAI para testar a conexão.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs"
import { randomBytes } from "node:crypto"
import { createInterface } from "node:readline"
import { c, loadEnv } from "./lib/env.mjs"
import { runChecks } from "../src/lib/setup/checks.ts"

const ENV_FILE = ".env.local"
const CHECK_ONLY = process.argv.includes("--check")

function readEnvFile() {
  if (!existsSync(ENV_FILE)) {
    if (existsSync(".env.example")) copyFileSync(".env.example", ENV_FILE)
    else writeFileSync(ENV_FILE, "")
    console.log(c.ok(`Criei o ${ENV_FILE} a partir do .env.example.`))
  }
  return readFileSync(ENV_FILE, "utf8")
}

function setVar(text, name, value) {
  const line = `${name}=${value}`
  const re = new RegExp(`^\\s*${name}\\s*=.*$`, "m")
  return re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`
}

function currentValue(text, name) {
  const m = new RegExp(`^\\s*${name}\\s*=\\s*(.*?)\\s*$`, "m").exec(text)
  return m ? m[1].replace(/^(['"])(.*)\1$/, "$2") : ""
}

/* Pergunta no terminal. Com secret=true, não mostra o que é digitado. */
function ask(question, { secret = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (secret) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s)
        else rl.output.write("*")
      }
    }
    rl.question(question, (answer) => {
      rl.close()
      if (secret) process.stdout.write("\n")
      resolve(answer.trim())
    })
  })
}

const QUESTIONS = [
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    label: "URL do Supabase",
    where: "Supabase > Project Settings > API > Project URL (ex.: https://abcd.supabase.co)",
    validate: (v) => /^https?:\/\/.+/.test(v) || "Precisa começar com https://",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    label: "Chave pública (anon / publishable) do Supabase",
    where: "Supabase > Project Settings > API > anon public",
    secret: true,
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    label: "Chave secreta (service_role / secret) do Supabase",
    where: "Supabase > Project Settings > API > service_role (NUNCA compartilhe esta)",
    secret: true,
  },
  {
    name: "OPENAI_API_KEY",
    label: "Chave da OpenAI",
    where: "platform.openai.com > API keys > Create new secret key",
    secret: true,
  },
]

if (!CHECK_ONLY) {
  console.log(c.bold("\nAssistente de instalação do Hub de Agentes\n"))
  console.log(c.dim("As chaves ficam só no .env.local deste computador. Se não souber onde achar, o texto 'onde' mostra o caminho.\n"))

  let text = readEnvFile()
  let changed = false

  for (const q of QUESTIONS) {
    if (currentValue(text, q.name)) {
      console.log(c.ok(`${q.label}: já preenchida`))
      continue
    }
    console.log(c.step(`${q.label}`))
    console.log(c.dim(`  onde: ${q.where}`))
    let value = ""
    while (true) {
      value = await ask("  cole aqui (Enter para pular): ", { secret: q.secret })
      if (!value) break
      const ok = q.validate ? q.validate(value) : true
      if (ok === true) break
      console.log(c.fail(`  ${ok}`))
    }
    if (value) {
      text = setVar(text, q.name, value)
      changed = true
    }
  }

  if (!currentValue(text, "OPENAI_MODEL")) {
    console.log(c.step("Modelo do chat da OpenAI"))
    console.log(c.dim("  onde: platform.openai.com > Models (copie o nome exato de um modelo de chat)"))
    const model = await ask("  nome do modelo (Enter para usar gpt-6-luna): ")
    text = setVar(text, "OPENAI_MODEL", model || "gpt-6-luna")
    changed = true
  }
  if (!currentValue(text, "OPENAI_TRANSCRIBE_MODEL")) {
    console.log(c.step("Modelo de transcrição de áudio (opcional)"))
    console.log(c.dim("  onde: platform.openai.com > Models (ex.: gpt-4o-mini-transcribe). Vazio = áudio desligado."))
    const t = await ask("  nome do modelo (Enter para pular): ")
    if (t) {
      text = setVar(text, "OPENAI_TRANSCRIBE_MODEL", t)
      changed = true
    }
  }

  if (!currentValue(text, "CRON_SECRET")) {
    text = setVar(text, "CRON_SECRET", randomBytes(24).toString("hex"))
    changed = true
    console.log(c.ok("CRON_SECRET gerado automaticamente."))
  }
  if (!currentValue(text, "NEXT_PUBLIC_SITE_URL")) {
    text = setVar(text, "NEXT_PUBLIC_SITE_URL", "http://localhost:3000")
    changed = true
  }

  if (changed) {
    writeFileSync(ENV_FILE, text)
    console.log(c.ok(`Salvo em ${ENV_FILE}.`))
  }
}

loadEnv(ENV_FILE)
console.log(c.bold("\nConferindo a instalação...\n"))
const checks = await runChecks()
let blocking = 0
let lastStep = 0
for (const check of checks) {
  if (check.step !== lastStep) {
    lastStep = check.step
    console.log(c.dim(`Passo ${check.step}`))
  }
  const line = `${check.title}: ${check.detail}`
  if (check.status === "ok") console.log(`  ${c.ok(line)}`)
  else if (check.status === "fail") {
    blocking++
    console.log(`  ${c.fail(line)}`)
    if (check.fix) console.log(c.dim(`      ➜ ${check.fix}`))
  } else if (check.status === "warn") {
    console.log(`  ${c.warn(line)}`)
    if (check.fix) console.log(c.dim(`      ➜ ${check.fix}`))
  } else console.log(`  ${c.dim(`– ${line}`)}`)
}

if (blocking === 0) {
  console.log(c.bold(`\nTudo pronto ➜ rode \`npm run dev\` e abra ${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}\n`))
} else {
  console.log(c.bold(`\nFalta resolver ${blocking} item(ns). Siga o "➜" de cada um e rode \`npm run setup\` de novo.`))
  console.log(c.dim("Travou? `npm run diagnostico` gera um relatório sem segredos para colar na sua IA.\n"))
  process.exitCode = 1
}
