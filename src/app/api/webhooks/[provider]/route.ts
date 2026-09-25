import { z } from "zod"
import { grantAccessByEmail, normalizeEmail, revokeAccess } from "@/lib/access"
import { getProvider, NotConfiguredError } from "@/lib/payments"
import { createAdminClient } from "@/lib/supabase/server"

/*
 * WEBHOOK DE PAGAMENTO (qualquer provedor)
 * POST /api/webhooks/<provedor>  (ex.: /api/webhooks/hubla)
 * 1. confere o token/assinatura do provedor
 * 2. grava o aviso uma vez só (reenvio = 200 "duplicado")
 * 3. filtra pelos produtos aceitos
 * 4. libera (convida se for nova conta) ou revoga o acesso
 * Os adaptadores ficam em src/lib/payments/.
 */

export const runtime = "nodejs"

function reply(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status })
}

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerId } = await params
  const provider = getProvider(providerId)
  if (!provider) return reply(404, { error: "Provedor de pagamento desconhecido." })

  const rawBody = await request.text()

  try {
    if (!provider.verify(request, rawBody)) return reply(401, { error: "Token inválido." })
  } catch (err) {
    if (err instanceof NotConfiguredError) {
      console.error(`[webhook:${provider.id}]`, err.message)
      return reply(503, { error: "Webhook não configurado." })
    }
    throw err
  }

  let json: unknown
  try {
    json = JSON.parse(rawBody)
  } catch {
    return reply(400, { error: "Corpo inválido: JSON esperado." })
  }

  const parsed = provider.parse(json)
  if (!parsed.ok) return reply(400, { error: parsed.error })
  const action = parsed.result

  let email: string | null = null
  if (action.action !== "ignore") {
    email = z.email().safeParse(action.email).success ? normalizeEmail(action.email) : null
    if (!email) return reply(400, { error: "Aviso sem e-mail válido do comprador." })
  }

  const idempotencyKey = provider.idempotencyKey(request, rawBody)
  const admin = createAdminClient()
  const { error: insertError } = await admin.from("webhook_events").insert({
    idempotency_key: `${provider.id}:${idempotencyKey}`,
    provider: provider.id,
    type: parsed.eventType,
    email,
    sandbox: provider.isSandbox?.(request) ?? false,
  })
  if (insertError) {
    if (insertError.code === "23505") return reply(200, { ok: true, result: "duplicado" })
    console.error(`[webhook:${provider.id}] falha ao registrar o aviso:`, insertError.code, insertError.message)
    return reply(500, { error: "Falha ao registrar o aviso. Tente de novo." })
  }

  if (action.action === "ignore") return reply(200, { ok: true, result: "ignorado" })

  const allowed = provider.allowedProductIds()
  if (allowed.length && !action.productIds.some((id) => allowed.includes(id))) {
    return reply(200, { ok: true, result: "ignorado", reason: "produto" })
  }

  try {
    if (action.action === "grant") {
      const { invited } = await grantAccessByEmail({
        email: email!,
        fullName: action.fullName,
        source: provider.id,
        externalId: action.externalId,
        productId: action.productIds[0],
        raw: json,
      })
      return reply(200, { ok: true, result: invited ? "convidado" : "liberado" })
    }

    const { blocked } = await revokeAccess({
      email: email!,
      provider: provider.id,
      externalId: action.externalId,
      reason: action.reason,
    })
    return reply(200, { ok: true, result: blocked ? "bloqueado" : "vinculo-encerrado" })
  } catch (err) {
    console.error(`[webhook:${provider.id}] falha ao processar`, parsed.eventType, err instanceof Error ? err.message : err)
    // libera a chave para o provedor poder reenviar
    await admin.from("webhook_events").delete().eq("idempotency_key", `${provider.id}:${idempotencyKey}`)
    return reply(500, { error: "Falha ao processar o aviso. Tente de novo." })
  }
}
