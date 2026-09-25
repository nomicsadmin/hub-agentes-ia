/*
 * Cria (ou promove) um admin do Hub de Agentes.
 *
 *   npm run admin:criar -- email@exemplo.com "Nome Completo"
 *
 * 1. cria o usuário no Auth já confirmado (ou encontra o existente);
 * 2. perfil com papel admin e status ativo;
 * 3. vínculo de acesso "manual";
 * 4. imprime um link para definir a senha (sem depender de e-mail).
 *
 * Lê as variáveis do ambiente ou do .env.local. Nunca imprime segredos.
 */
import { existsSync, readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

function loadEnv() {
  const env = { ...process.env }
  if (existsSync(".env.local")) {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
      if (!m || env[m[1]]) continue
      env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2")
    }
  }
  return env
}

function fail(message) {
  console.error(`Erro: ${message}`)
  process.exit(1)
}

const [rawEmail, ...nameParts] = process.argv.slice(2)
const fullName = nameParts.join(" ").trim() || null
if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
  fail('uso: npm run admin:criar -- email@exemplo.com "Nome Completo"')
}
const email = rawEmail.trim().toLowerCase()

const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
const siteUrl = (env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "")
if (!url) fail("NEXT_PUBLIC_SUPABASE_URL não está definida (.env.local). Rode `npm run setup` primeiro.")
if (!serviceKey) fail("SUPABASE_SERVICE_ROLE_KEY não está definida (.env.local). Rode `npm run setup` primeiro.")

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

async function findAuthUserId() {
  // 1) pelo perfil (o gatilho copia o e-mail do Auth)
  const { data: profile, error } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle()
  if (error) fail(`não foi possível buscar o perfil (${error.message}).`)
  if (profile) return profile.id

  // 2) direto no Auth, página a página
  for (let page = 1; page <= 50; page++) {
    const { data, error: listError } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (listError) fail(`não foi possível listar os usuários (${listError.message}).`)
    const found = data.users.find((u) => u.email?.toLowerCase() === email)
    if (found) return found.id
    if (data.users.length < 200) break
  }
  return null
}

let userId = await findAuthUserId()
let created = false

if (!userId) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : {},
  })
  if (error || !data.user) fail(`não foi possível criar o usuário (${error?.message ?? "sem usuário"}).`)
  userId = data.user.id
  created = true
}

// perfil: o gatilho já cria; o upsert cobre o caso de ele não existir
const profilePatch = { id: userId, email, role: "admin", status: "active" }
if (fullName) profilePatch.full_name = fullName
const { error: profileError } = await supabase.from("profiles").upsert(profilePatch, { onConflict: "id" })
if (profileError) fail(`não foi possível gravar o perfil (${profileError.message}).`)

// vínculo manual (um por pessoa)
const { data: existing, error: entError } = await supabase
  .from("entitlements")
  .select("id")
  .eq("provider", "manual")
  .eq("user_id", userId)
  .is("external_id", null)
  .limit(1)
  .maybeSingle()
if (entError) fail(`não foi possível buscar o vínculo (${entError.message}).`)

const entitlement = { user_id: userId, email, provider: "manual", status: "manual", updated_at: new Date().toISOString() }
const { error: saveError } = existing
  ? await supabase.from("entitlements").update(entitlement).eq("id", existing.id)
  : await supabase.from("entitlements").insert(entitlement)
if (saveError) fail(`não foi possível gravar o vínculo (${saveError.message}).`)

// link para definir a senha, sem passar por e-mail
const { data: link, error: linkError } = await supabase.auth.admin.generateLink({ type: "recovery", email })
if (linkError || !link?.properties?.hashed_token) {
  fail(`não foi possível gerar o link de senha (${linkError?.message ?? "sem token"}).`)
}

const setupUrl = `${siteUrl}/auth/confirm?token_hash=${encodeURIComponent(link.properties.hashed_token)}&type=recovery&next=/definir-senha`

console.log(`${created ? "Admin criado" : "Admin atualizado"}: ${email}`)
console.log("")
console.log("Abra este link para definir a senha (vale por 1 hora e só funciona uma vez):")
console.log(setupUrl)
