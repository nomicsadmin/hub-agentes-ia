import { pub, g } from "@/config/copy"

/* Rótulos e opções do admin (servidor e navegador). */

/* Status do último vínculo de compra (qualquer provedor de pagamento) */
export const PURCHASE_STATUS_LABEL: Record<string, string> = {
  active: "Compra ativa",
  manual: "Liberação manual",
  refunded: "Reembolsada",
  canceled: "Cancelada",
  chargeback: "Chargeback",
}

export function purchaseLabel(status: string | null | undefined) {
  if (!status) return "Sem compra"
  return PURCHASE_STATUS_LABEL[status] ?? status
}

export const ACCESS_STATUS_LABEL: Record<string, string> = {
  active: "Liberado",
  blocked: "Bloqueado",
}

export const ROLE_LABEL: Record<string, string> = {
  student: pub.Um,
  admin: "Admin",
}

export const USER_FILTERS = [
  { value: "todas", label: g("Todos", "Todas") },
  { value: "ativas", label: `${g("Ativos", "Ativas")} nos últimos 7 dias` },
  { value: "bloqueadas", label: g("Bloqueados", "Bloqueadas") },
  { value: "sem-7", label: "Sem acesso há 7 dias" },
  { value: "sem-15", label: "Sem acesso há 15 dias" },
  { value: "sem-30", label: "Sem acesso há 30 dias" },
  { value: "admins", label: "Admins" },
] as const

export type UserFilter = (typeof USER_FILTERS)[number]["value"]

export const USER_SORTS = [
  { value: "acesso", label: "Último acesso" },
  { value: "mensagens", label: "Mais mensagens" },
  { value: "acessos", label: "Mais acessos" },
  { value: "nome", label: "Nome" },
  { value: "recentes", label: "Cadastro mais recente" },
] as const

export type UserSort = (typeof USER_SORTS)[number]["value"]

export const DOC_STATUS_LABEL: Record<string, string> = {
  processing: "Processando",
  ready: "Pronto",
  error: "Erro",
}

export const LIMIT_FIELDS = [
  { key: "messages", label: "Mensagens por dia", help: "Perguntas enviadas a qualquer agente." },
  { key: "audio", label: "Áudios por dia", help: "Cada áudio é transcrito e tem custo por minuto." },
  { key: "attachments", label: "Anexos por dia", help: "PDFs e imagens enviados no chat." },
  { key: "pdfs", label: "PDFs gerados por dia", help: "Documentos que o agente monta para baixar." },
] as const

export type LimitKey = (typeof LIMIT_FIELDS)[number]["key"]
