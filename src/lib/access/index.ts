import "server-only"
import { createAdminClient } from "@/lib/supabase/server"
import { publicEnv } from "@/lib/env.public"
import type { Json } from "@/lib/supabase/types"

/*
 * ACESSO: liberar e bloquear pessoas.
 * Tudo aqui usa a service role (ignora o RLS). Quem chama é
 * responsável por checar a permissão antes: o webhook confere o
 * token do provedor de pagamento; o painel admin chama requireAdmin().
 */

type Admin = ReturnType<typeof createAdminClient>

/** "manual" (admin) ou o id de um provedor de pagamento (ex.: "hubla"); veja src/lib/payments */
export type AccessSource = string
export type RevokeReason = "refunded" | "canceled" | "chargeback"

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function passwordSetupUrl() {
  return `${publicEnv.siteUrl}/auth/confirm?next=/definir-senha`
}

/*
 * O Auth do Supabase guarda o e-mail em minúsculas e o gatilho
 * handle_new_user copia para profiles.email, então a comparação
 * exata com o e-mail normalizado equivale a lower(email).
 */
async function findProfileByEmail(admin: Admin, email: string) {
  const { data, error } = await admin
    .from("profiles")
    .select("id, role, status, full_name")
    .eq("email", email)
    .maybeSingle()
  if (error) throw new Error(`Não foi possível buscar o perfil: ${error.message}`)
  return data
}

async function upsertEntitlement(
  admin: Admin,
  row: {
    userId: string
    email: string
    provider: string
    status: "active" | "manual"
    externalId?: string
    productId?: string
    raw?: unknown
  }
) {
  const now = new Date().toISOString()
  const values = {
    user_id: row.userId,
    email: row.email,
    provider: row.provider,
    status: row.status,
    external_id: row.externalId ?? null,
    product_id: row.productId ?? null,
    raw: (row.raw ?? null) as Json,
    updated_at: now,
  }

  if (row.externalId) {
    const { error } = await admin.from("entitlements").upsert(values, { onConflict: "provider,external_id" })
    if (error) throw new Error(`Não foi possível gravar o vínculo de acesso: ${error.message}`)
    return
  }

  // sem id externo (liberação manual): um vínculo por pessoa e provedor
  const { data: existing, error: findError } = await admin
    .from("entitlements")
    .select("id")
    .eq("provider", row.provider)
    .eq("user_id", row.userId)
    .is("external_id", null)
    .limit(1)
    .maybeSingle()
  if (findError) throw new Error(`Não foi possível buscar o vínculo de acesso: ${findError.message}`)

  const { error } = existing
    ? await admin.from("entitlements").update(values).eq("id", existing.id)
    : await admin.from("entitlements").insert(values)
  if (error) throw new Error(`Não foi possível gravar o vínculo de acesso: ${error.message}`)
}

/*
 * Libera o acesso. Se a pessoa ainda não existe, manda o convite do
 * Supabase (o gatilho cria o perfil) para ela definir a senha.
 */
export async function grantAccessByEmail(input: {
  email: string
  fullName?: string
  source: AccessSource
  externalId?: string
  productId?: string
  raw?: unknown
}): Promise<{ userId: string; invited: boolean }> {
  const admin = createAdminClient()
  const email = normalizeEmail(input.email)
  const fullName = input.fullName?.trim() || undefined

  let profile = await findProfileByEmail(admin, email)
  let invited = false

  if (!profile) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: fullName ? { full_name: fullName } : undefined,
      redirectTo: passwordSetupUrl(),
    })
    if (error || !data.user) {
      throw new Error(`Não foi possível convidar ${email}: ${error?.message ?? "sem usuário"}`)
    }
    invited = true
    profile = await findProfileByEmail(admin, email)
    if (!profile) {
      // o gatilho não rodou: cria o perfil aqui para não perder a compra
      const { error: insertError } = await admin
        .from("profiles")
        .insert({ id: data.user.id, email, full_name: fullName ?? null })
      if (insertError) throw new Error(`Não foi possível criar o perfil: ${insertError.message}`)
      profile = { id: data.user.id, role: "student", status: "active", full_name: fullName ?? null }
    }
  }

  const patch: { status: "active"; full_name?: string } = { status: "active" }
  if (fullName && !profile.full_name) patch.full_name = fullName
  const { error: updateError } = await admin.from("profiles").update(patch).eq("id", profile.id)
  if (updateError) throw new Error(`Não foi possível liberar o perfil: ${updateError.message}`)

  await upsertEntitlement(admin, {
    userId: profile.id,
    email,
    provider: input.source,
    status: input.source === "manual" ? "manual" : "active",
    externalId: input.externalId,
    productId: input.productId,
    raw: input.raw,
  })

  return { userId: profile.id, invited }
}

/*
 * Reembolso, cancelamento ou chargeback. Marca o vínculo e, se não
 * sobrar nenhum vínculo ativo ou manual, bloqueia a pessoa.
 * Nunca bloqueia quem é admin.
 */
export async function revokeAccess(input: {
  email: string
  /** id do provedor de pagamento (ex.: "hubla") */
  provider: string
  externalId?: string
  reason: RevokeReason
}): Promise<{ userId: string | null; blocked: boolean }> {
  const admin = createAdminClient()
  const email = normalizeEmail(input.email)
  const now = new Date().toISOString()

  let matched = 0
  if (input.externalId) {
    const { data, error } = await admin
      .from("entitlements")
      .update({ status: input.reason, updated_at: now })
      .eq("provider", input.provider)
      .eq("external_id", input.externalId)
      .select("id")
    if (error) throw new Error(`Não foi possível marcar o vínculo: ${error.message}`)
    matched = data.length
  }

  if (matched === 0) {
    // sem id externo (ou id desconhecido): encerra os vínculos deste provedor ainda ativos deste e-mail
    const { error } = await admin
      .from("entitlements")
      .update({ status: input.reason, updated_at: now })
      .eq("provider", input.provider)
      .eq("email", email)
      .eq("status", "active")
    if (error) throw new Error(`Não foi possível marcar o vínculo: ${error.message}`)
  }

  const profile = await findProfileByEmail(admin, email)
  if (!profile) return { userId: null, blocked: false }
  if (profile.role === "admin") return { userId: profile.id, blocked: false }

  const { count, error: countError } = await admin
    .from("entitlements")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .in("status", ["active", "manual"])
  if (countError) throw new Error(`Não foi possível conferir os vínculos: ${countError.message}`)

  if ((count ?? 0) > 0) return { userId: profile.id, blocked: false }

  const { error } = await admin.from("profiles").update({ status: "blocked" }).eq("id", profile.id)
  if (error) throw new Error(`Não foi possível bloquear o perfil: ${error.message}`)
  return { userId: profile.id, blocked: true }
}

/* Bloqueio ou liberação manual pelo admin. */
export async function setAccessStatus(userId: string, status: "active" | "blocked"): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from("profiles").update({ status }).eq("id", userId)
  if (error) throw new Error(`Não foi possível mudar o status: ${error.message}`)
}

/* Promove a admin ou volta a usuário comum. */
export async function setRole(userId: string, role: "student" | "admin"): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId)
  if (error) throw new Error(`Não foi possível mudar o papel: ${error.message}`)
}
