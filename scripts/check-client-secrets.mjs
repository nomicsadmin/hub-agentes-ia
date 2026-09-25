/*
 * Roda depois do build: procura segredos nos arquivos que vão para o
 * navegador (.next/static). Se achar o valor ou o nome de um segredo,
 * falha e o deploy para.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs"
import { join } from "node:path"

const SECRET_NAMES = ["SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY", "HUBLA_WEBHOOK_TOKEN", "CRON_SECRET", "SUPABASE_DB_PASSWORD"]

// valores: do ambiente (Vercel) ou do .env.local (máquina local)
const values = new Map()
for (const name of SECRET_NAMES) if (process.env[name]) values.set(name, process.env[name])
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (m && SECRET_NAMES.includes(m[1]) && m[2]) values.set(m[1], m[2])
  }
}

const dir = ".next/static"
if (!existsSync(dir)) {
  console.error("check-client-secrets: .next/static não existe. Rode o build antes.")
  process.exit(1)
}

const files = []
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(js|css|html|json|map|txt)$/.test(p)) files.push(p)
  }
}
walk(dir)

const leaks = []
for (const file of files) {
  const text = readFileSync(file, "utf8")
  for (const [name, value] of values) {
    if (value.length >= 12 && text.includes(value)) leaks.push(`${file}: valor de ${name}`)
  }
  for (const name of SECRET_NAMES) {
    if (text.includes(name)) leaks.push(`${file}: nome ${name}`)
  }
}

if (leaks.length) {
  console.error("SEGREDO NO CÓDIGO DO NAVEGADOR. Build bloqueado:\n" + leaks.map((l) => "  - " + l).join("\n"))
  process.exit(1)
}
console.log(`check-client-secrets: ${files.length} arquivos do navegador verificados, nenhum segredo encontrado.`)
