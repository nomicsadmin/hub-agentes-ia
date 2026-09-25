/*
 * Utilitários dos scripts (terminal). Lê o .env.local sem nunca imprimir valores.
 */
import { existsSync, readFileSync } from "node:fs"

export function loadEnv(file = ".env.local") {
  if (!existsSync(file)) return
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line)
    if (!m || process.env[m[1]]) continue
    const value = m[2].replace(/^(['"])(.*)\1$/, "$2")
    if (value !== "") process.env[m[1]] = value
  }
}

export const c = {
  ok: (s) => `\x1b[32m✔\x1b[0m ${s}`,
  fail: (s) => `\x1b[31m✖\x1b[0m ${s}`,
  warn: (s) => `\x1b[33m!\x1b[0m ${s}`,
  step: (s) => `\x1b[36m➜\x1b[0m ${s}`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
}

export function fail(message, hint) {
  console.error(c.fail(message))
  if (hint) console.error(c.dim(`  ${hint}`))
  console.error(c.dim("  Travou? Rode `npm run diagnostico` e cole o resultado na sua IA (veja docs/ajuda-com-ia.md)."))
  process.exit(1)
}

export async function supabaseAdmin() {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    fail(
      "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env.local.",
      "Rode `npm run setup` para preencher, ou veja docs/03-supabase.md."
    )
  }
  const { createClient } = await import("@supabase/supabase-js")
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
