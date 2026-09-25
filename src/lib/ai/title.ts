import "server-only"
import { serverEnv } from "@/lib/env.server"
import { getOpenAI, logAIError } from "./openai"
import { pub } from "@/config/copy"

export const DEFAULT_CONVERSATION_TITLE = "Nova conversa"

/* Título de reserva: as primeiras palavras da pergunta. */
export function fallbackTitle(question: string) {
  const words = question.replace(/\s+/g, " ").trim().split(" ").slice(0, 7).join(" ")
  const t = words.length > 60 ? `${words.slice(0, 57)}...` : words
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : DEFAULT_CONVERSATION_TITLE
}

/* Chamada curta e barata: título de 3 a 6 palavras para a conversa. */
export async function generateTitle(question: string, signal?: AbortSignal): Promise<string> {
  const openai = getOpenAI()
  const q = question.trim()
  if (!openai || !q) return fallbackTitle(q)
  try {
    const res = await openai.responses.create(
      {
        model: serverEnv.OPENAI_MODEL,
        instructions:
          `Crie um título curto, de 3 a 6 palavras, em português do Brasil, para uma conversa que começa com a mensagem ${pub.do} ${pub.um}. Responda só com o título, sem aspas, sem ponto final e sem emojis.`,
        input: q.slice(0, 1500),
        max_output_tokens: 400,
        store: false,
      },
      { signal }
    )
    const title = res.output_text
      .split("\n")[0]
      .replace(/^["'“”«»\s]+|["'“”«»\s.]+$/g, "")
      .replace(/^t[íi]tulo:\s*/i, "")
      .trim()
    if (!title) return fallbackTitle(q)
    return title.length > 60 ? `${title.slice(0, 57)}...` : title
  } catch (err) {
    logAIError("title", err)
    return fallbackTitle(q)
  }
}
