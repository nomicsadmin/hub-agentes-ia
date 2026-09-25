import type { RevokeReason } from "@/lib/access"

/*
 * CONTRATO DE UM PROVEDOR DE PAGAMENTO
 * Cada plataforma (Hubla, Kiwify, Hotmart, Stripe...) vira um adaptador
 * que traduz o aviso dela em uma de três ações: liberar, revogar ou ignorar.
 * A rota /api/webhooks/[provider] cuida do resto (segurança, reenvio,
 * filtro de produto, convite e bloqueio). Guia: docs/08-pagamento.md
 */

export type PaymentAction =
  | {
      action: "grant"
      email: string
      fullName?: string
      /** id da assinatura/compra na plataforma (para revogar depois) */
      externalId?: string
      productIds: string[]
    }
  | {
      action: "revoke"
      email: string
      externalId?: string
      reason: RevokeReason
      productIds: string[]
    }
  | { action: "ignore"; eventType: string }

export type ParseResult = { ok: true; eventType: string; result: PaymentAction } | { ok: false; error: string }

export interface PaymentProvider {
  /** vai na URL: /api/webhooks/<id> */
  id: string
  /** nome exibido no painel admin */
  label: string
  /** confere a assinatura/token do aviso. Lança NotConfiguredError se faltar o segredo. */
  verify(request: Request, rawBody: string): boolean
  /** chave para ignorar reenvios do mesmo aviso */
  idempotencyKey(request: Request, rawBody: string): string
  /** aviso de teste da plataforma (só registrado, não muda nada diferente) */
  isSandbox?(request: Request): boolean
  /** traduz o JSON do aviso */
  parse(json: unknown): ParseResult
  /** produtos aceitos (vazio = todos). Normalmente vem de uma variável de ambiente. */
  allowedProductIds(): string[]
}

export class NotConfiguredError extends Error {}
