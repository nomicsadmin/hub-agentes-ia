import type { PaymentProvider } from "./types"
import { hubla } from "./hubla"

/*
 * PROVEDORES ATIVOS
 * Para adicionar Kiwify, Hotmart, Stripe etc.: crie um arquivo nesta
 * pasta seguindo o hubla.ts e registre aqui. Passo a passo em docs/08-pagamento.md.
 */
export const PROVIDERS: Record<string, PaymentProvider> = {
  [hubla.id]: hubla,
}

export function getProvider(id: string): PaymentProvider | null {
  return Object.hasOwn(PROVIDERS, id) ? PROVIDERS[id] : null
}

export function providerLabel(id: string | null | undefined) {
  if (!id) return "—"
  if (id === "manual") return "Liberação manual"
  return getProvider(id)?.label ?? id
}

export { NotConfiguredError, type PaymentProvider, type PaymentAction } from "./types"
