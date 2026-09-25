/*
 * PROCURA DADOS QUE NÃO PODEM IR PARA O GITHUB
 *
 *   npm run check:leaks
 *   npm run check:leaks -- --env=../outro-projeto/.env.local   compara com valores reais de outro .env
 *   npm run check:leaks -- --termos=caminho/termos.txt         nomes privados (um por linha)
 *
 * Falha (exit 1) se encontrar:
 *  - chaves e tokens (OpenAI, Supabase, JWT, Stripe, GitHub...);
 *  - endereço real de projeto Supabase;
 *  - QUALQUER valor do seu .env.local (comparado em memória, nunca impresso);
 *  - termos privados do arquivo .termos-privados (se existir; ele é ignorado pelo git);
 *  - metadados de autor/EXIF em imagens e PDFs (aviso).
 * Roda também no GitHub a cada push (.github/workflows/leaks.yml).
 */
import { execSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { extname, join } from "node:path"
import { c } from "./lib/env.mjs"

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=")
    return [k, v.join("=") || true]
  })
)

/* Arquivos a verificar: os que o git vai publicar (ou tudo, fora os ignorados comuns). */
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "meus-materiais", ".vercel", "coverage"])
const SKIP_FILES = new Set([".env.local", "diagnostico.txt", ".termos-privados", "package-lock.json"])

function listFiles() {
  try {
    const out = execSync("git ls-files --cached --others --exclude-standard", { stdio: ["ignore", "pipe", "ignore"] }).toString()
    const files = out.split("\n").filter(Boolean)
    if (files.length) return files.filter((f) => !SKIP_FILES.has(f.split("/").pop()))
  } catch {}
  const files = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (SKIP_DIRS.has(name)) continue
      const p = dir === "." ? name : join(dir, name)
      const st = statSync(p)
      if (st.isDirectory()) walk(p)
      else if (!SKIP_FILES.has(name) && !name.startsWith(".env") || name === ".env.example") files.push(p)
    }
  }
  walk(".")
  return files
}

const BINARY = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".pdf", ".woff", ".woff2", ".ttf", ".mp4", ".zip"])

const PATTERNS = [
  { name: "chave da OpenAI", re: /\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}/ },
  { name: "JWT (chave do Supabase ou token)", re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "chave nova do Supabase", re: /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{16,}/ },
  { name: "token de acesso do Supabase", re: /\bsbp_[a-f0-9]{30,}/ },
  { name: "endereço real de projeto Supabase", re: /\b[a-z0-9]{20}\.supabase\.co\b/ },
  { name: "string de conexão Postgres com senha", re: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]{6,}@/ },
  { name: "chave da Stripe", re: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}/ },
  { name: "token do GitHub", re: /\bgh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: "chave privada", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
]

/* Valores reais de .env (o deste projeto e, opcionalmente, outro). */
function envValues(file) {
  if (!file || !existsSync(file)) return []
  return readFileSync(file, "utf8")
    .split("\n")
    .map((l) => /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(l))
    .filter(Boolean)
    .map((m) => ({ name: m[1], value: m[2].replace(/^(['"])(.*)\1$/, "$2") }))
    .filter((e) => e.value.length >= 12 && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(e.value) && !/^(gpt|text-embedding|whisper)/.test(e.value))
}
const secrets = [...envValues(".env.local"), ...envValues(typeof args.env === "string" ? args.env : undefined)]

/* Termos privados: um por linha. O arquivo fica fora do git. */
const termsFile = typeof args.termos === "string" ? args.termos : ".termos-privados"
const terms = existsSync(termsFile)
  ? readFileSync(termsFile, "utf8")
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t && !t.startsWith("#"))
  : []

const findings = []
const warnings = []
const files = listFiles()

for (const file of files) {
  if (!existsSync(file) || statSync(file).isDirectory()) continue
  const ext = extname(file).toLowerCase()
  const buf = readFileSync(file)

  if (BINARY.has(ext)) {
    const latin = buf.toString("latin1")
    if (/Exif\0\0|<x:xmpmeta|\/Author\s*\(|tEXtAuthor|iTXtXML:com\.adobe\.xmp/.test(latin)) {
      warnings.push(`${file}: tem metadados (EXIF/XMP/autor). Reexporte a imagem sem metadados.`)
    }
    for (const t of terms) if (latin.toLowerCase().includes(t.toLowerCase())) findings.push(`${file}: contém um termo privado (linha ${terms.indexOf(t) + 1} do arquivo de termos)`)
    continue
  }

  const text = buf.toString("utf8")
  const lines = text.split("\n")
  lines.forEach((line, i) => {
    for (const p of PATTERNS) if (p.re.test(line)) findings.push(`${file}:${i + 1} parece ${p.name}`)
    for (const s of secrets) if (line.includes(s.value)) findings.push(`${file}:${i + 1} contém o valor de ${s.name}`)
    const low = line.toLowerCase()
    terms.forEach((t, ti) => {
      if (low.includes(t.toLowerCase())) findings.push(`${file}:${i + 1} contém um termo privado (linha ${ti + 1} do arquivo de termos)`)
    })
  })
}

console.log(c.bold(`\nVerificação de vazamentos: ${files.length} arquivos, ${secrets.length} valores de .env, ${terms.length} termos privados\n`))
for (const w of warnings) console.log(c.warn(w))
if (findings.length) {
  for (const f of findings) console.log(c.fail(f))
  console.log(c.bold(`\n${findings.length} problema(s). Remova antes de publicar.`))
  console.log(c.dim("Se já foi para o GitHub: troque (rotacione) a chave na plataforma. Apagar o arquivo não basta, o histórico guarda."))
  process.exit(1)
}
console.log(c.ok("Nenhum segredo ou termo privado encontrado.\n"))
