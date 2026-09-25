import "server-only"
import OpenAI, { APIError, APIUserAbortError } from "openai"
import { serverEnv } from "@/lib/env.server"

export const MISSING_KEY_MESSAGE = "A chave da OpenAI ainda não foi configurada."

let client: OpenAI | null = null

/* Cliente da OpenAI, ou null enquanto OPENAI_API_KEY não existir. */
export function getOpenAI(): OpenAI | null {
  if (!serverEnv.OPENAI_API_KEY) return null
  client ??= new OpenAI({ apiKey: serverEnv.OPENAI_API_KEY, maxRetries: 1 })
  return client
}

export function isAbortError(err: unknown) {
  return err instanceof APIUserAbortError || (err instanceof Error && err.name === "AbortError")
}

/* Mensagem amigável para o usuário; o detalhe técnico fica só no log. */
export function friendlyAIError(err: unknown): string {
  if (err instanceof APIError) {
    if (err.status === 401) return "A chave da OpenAI é inválida. Avise o suporte."
    if (err.status === 404) return "O modelo de IA configurado não está disponível. Avise o suporte."
    if (err.status === 429) return "Muita gente usando agora. Espere alguns segundos e tente de novo."
    if (err.status === 400) return "Não consegui ler esta mensagem ou um dos anexos. Tente de novo sem o anexo."
    if (err.status && err.status >= 500) return "A OpenAI está instável agora. Tente de novo em instantes."
  }
  return "Não consegui responder agora. Tente de novo."
}

/* Log sem dados pessoais: só o tipo e o código do erro. */
export function logAIError(where: string, err: unknown) {
  if (err instanceof APIError) {
    console.error(`[${where}] OpenAI ${err.status ?? "?"} ${err.code ?? ""} ${err.requestID ?? ""}`.trim())
  } else if (err instanceof Error) {
    console.error(`[${where}] ${err.name}: ${err.message.slice(0, 200)}`)
  } else {
    console.error(`[${where}] erro desconhecido`)
  }
}
