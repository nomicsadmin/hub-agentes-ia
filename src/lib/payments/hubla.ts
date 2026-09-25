import { z } from "zod"
import { serverEnv } from "@/lib/env.server"
import { NotConfiguredError, type PaymentProvider } from "./types"
import { csvList, safeEqual, sha256 } from "./util"

/*
 * ADAPTADOR DA HUBLA (webhook v2)
 * customer.member_added   → libera o acesso (convida se for novo)
 * customer.member_removed → encerra o vínculo e bloqueia se não sobrar outro acesso
 * Configure na Hubla: URL https://SEU-DOMINIO/api/webhooks/hubla
 * e o token em HUBLA_WEBHOOK_TOKEN (header x-hubla-token).
 */

const id = z.union([z.string().min(1), z.number()]).transform(String)
const product = z.object({ id, name: z.string().nullish() }).loose()

const payloadSchema = z
  .object({
    type: z.string().min(1),
    version: z.union([z.string(), z.number()]).nullish(),
    event: z
      .object({
        product: product.nullish(),
        products: z.array(product).nullish(),
        subscription: z.object({ id, status: z.string().nullish(), type: z.string().nullish() }).loose().nullish(),
        user: z
          .object({
            firstName: z.string().nullish(),
            lastName: z.string().nullish(),
            email: z.string().trim().nullish(),
          })
          .loose()
          .nullish(),
      })
      .loose(),
  })
  .loose()

export const hubla: PaymentProvider = {
  id: "hubla",
  label: "Hubla",

  verify(request) {
    const expected = serverEnv.HUBLA_WEBHOOK_TOKEN
    if (!expected) throw new NotConfiguredError("HUBLA_WEBHOOK_TOKEN não configurada")
    return safeEqual(request.headers.get("x-hubla-token") ?? "", expected)
  },

  idempotencyKey(request, rawBody) {
    return request.headers.get("x-hubla-idempotency")?.trim() || `sha256:${sha256(rawBody)}`
  },

  isSandbox(request) {
    return request.headers.get("x-hubla-sandbox")?.trim().toLowerCase() === "true"
  },

  allowedProductIds() {
    return csvList(serverEnv.HUBLA_PRODUCT_IDS)
  },

  parse(json) {
    const parsed = payloadSchema.safeParse(json)
    if (!parsed.success) return { ok: false, error: "Formato de aviso não reconhecido." }
    const p = parsed.data
    const productIds = [
      ...new Set([p.event.product?.id, ...(p.event.products ?? []).map((x) => x.id)].filter((x): x is string => !!x)),
    ]
    const email = p.event.user?.email ?? ""
    const externalId = p.event.subscription?.id

    if (p.type === "customer.member_added") {
      const u = p.event.user
      const fullName = [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim() || undefined
      return { ok: true, eventType: p.type, result: { action: "grant", email, fullName, externalId, productIds } }
    }
    if (p.type === "customer.member_removed") {
      return { ok: true, eventType: p.type, result: { action: "revoke", email, externalId, reason: "canceled", productIds } }
    }
    return { ok: true, eventType: p.type, result: { action: "ignore", eventType: p.type } }
  },
}
