/*
 * RELATÓRIO PARA PEDIR AJUDA
 *
 *   npm run diagnostico
 *
 * Gera um resumo da instalação para colar numa IA (Claude, ChatGPT, Cursor).
 * Chaves, tokens, e-mails e o endereço do seu projeto saem como [OCULTO].
 * Também salva em diagnostico.txt (ignorado pelo git).
 */
import { execSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import os from "node:os"
import { c, loadEnv } from "./lib/env.mjs"
import { redact, runChecks } from "../src/lib/setup/checks.ts"

loadEnv()

const ENV_NAMES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_TRANSCRIBE_MODEL",
  "OPENAI_EMBEDDING_MODEL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_BASE_PATH",
  "ALLOWED_ORIGINS",
  "CRON_SECRET",
  "HUBLA_WEBHOOK_TOKEN",
  "HUBLA_PRODUCT_IDS",
]
const SHOW_VALUE = new Set(["OPENAI_MODEL", "OPENAI_TRANSCRIBE_MODEL", "OPENAI_EMBEDDING_MODEL", "NEXT_PUBLIC_BASE_PATH"])
const OPTIONAL = new Set(["OPENAI_TRANSCRIBE_MODEL", "OPENAI_EMBEDDING_MODEL", "NEXT_PUBLIC_BASE_PATH", "ALLOWED_ORIGINS", "HUBLA_WEBHOOK_TOKEN", "HUBLA_PRODUCT_IDS"])

function safe(cmd) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim()
  } catch {
    return "(indisponível)"
  }
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"))
const lines = []
const out = (s = "") => lines.push(s)

out("## Diagnóstico do Hub de Agentes")
out(`Gerado em: ${new Date().toISOString()}`)
out()
out("### Ambiente")
out(`- Sistema: ${os.type()} ${os.release()} (${os.arch()})`)
out(`- Node: ${process.versions.node}`)
out(`- npm: ${safe("npm -v")}`)
out(`- Next: ${pkg.dependencies?.next ?? "?"}`)
out(`- Supabase CLI: ${safe("npx --no-install supabase --version")}`)
out(`- .env.local existe: ${existsSync(".env.local") ? "sim" : "NÃO"}`)
out(`- node_modules instalado: ${existsSync("node_modules") ? "sim" : "NÃO (rode npm install)"}`)
out()
out("### Variáveis (só se existem; valores ocultos)")
for (const name of ENV_NAMES) {
  const v = process.env[name]
  const shown = v && SHOW_VALUE.has(name) ? ` = ${v}` : ""
  out(`- ${v ? "✔" : OPTIONAL.has(name) ? "–" : "✖"} ${name}${shown}${!v && OPTIONAL.has(name) ? " (opcional)" : ""}`)
}
out()
out("### Migrations no projeto")
const migDir = "supabase/migrations"
for (const f of existsSync(migDir) ? readdirSync(migDir).sort() : []) out(`- ${f}`)
out()
out("### Agentes na pasta agentes/")
for (const d of existsSync("agentes") ? readdirSync("agentes", { withFileTypes: true }) : []) {
  if (d.isDirectory() && !d.name.startsWith("_")) {
    const hasCfg = existsSync(`agentes/${d.name}/agente.json`)
    const hasPrompt = existsSync(`agentes/${d.name}/prompt.md`)
    out(`- ${d.name}: agente.json ${hasCfg ? "✔" : "✖"} · prompt.md ${hasPrompt ? "✔" : "✖"}`)
  }
}
out()
out("### Checagens")
try {
  for (const ch of await runChecks()) {
    const mark = { ok: "✔", fail: "✖", warn: "!", skip: "–" }[ch.status]
    out(`- ${mark} [passo ${ch.step}] ${ch.title}: ${ch.detail}${ch.fix && ch.status !== "ok" ? ` ➜ ${ch.fix}` : ""}`)
  }
} catch (err) {
  out(`- ✖ as checagens falharam: ${err instanceof Error ? err.message : String(err)}`)
}
out()
out("### O que eu estava fazendo (preencha)")
out("- Passo em que travei: ")
out("- Comando que rodei: ")
out("- Mensagem de erro completa: ")

const report = redact(lines.join("\n"))
writeFileSync("diagnostico.txt", report + "\n")
console.log(report)
console.log(c.dim("\nSalvo também em diagnostico.txt. Confira: não há chaves no texto acima."))
console.log(c.dim("Cole na sua IA junto com: \"Me ajude a resolver este erro na instalação do Hub de Agentes.\""))
