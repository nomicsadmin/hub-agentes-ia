import "server-only"
import { z } from "zod"
import { zodTextFormat } from "openai/helpers/zod"
import { serverEnv } from "@/lib/env.server"
import { createAdminClient } from "@/lib/supabase/server"
import { getOpenAI, logAIError } from "./openai"
import { appConfig } from "@/config/app.config"
import { pub } from "@/config/copy"

/*
 * CLASSIFICAÇÃO DE TEMAS E DIFICULDADES (plano 4.1)
 * Roda depois da resposta (via `after` na rota do chat), sem atrasar a
 * pessoa. Uma chamada barata com saída estruturada escolhe o tema da
 * lista `topics` e resume a pergunta; os sinais de dificuldade são
 * somados aqui e gravados em message_insights (só o admin lê).
 * Falha em silêncio: só um log técnico, sem dados do usuário.
 * O 👎 (messages.feedback = -1) é somado no painel, não aqui.
 */

const CONFUSION = [
  "nao entendi",
  "não entendi",
  "nao compreendi",
  "não compreendi",
  "como assim",
  "to perdida",
  "tô perdida",
  "estou perdida",
  "to confusa",
  "tô confusa",
  "estou confusa",
  "nao sei o que fazer",
  "não sei o que fazer",
  "nao consigo entender",
  "não consigo entender",
  "ficou confuso",
  "nao ficou claro",
  "não ficou claro",
  "explica de novo",
  "explica melhor",
  "pode repetir",
  "socorro",
]

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

export function hasConfusion(text: string) {
  const t = normalize(text)
  return CONFUSION.some((p) => t.includes(normalize(p)))
}

export function isGapAnswer(answer: string) {
  const t = normalize(answer)
  return t.includes("nao esta no material") || t.includes("nao consta no material") || t.includes("nao aparece no material")
}

const LONG_CONVERSATION_USER_MESSAGES = 8

export type ClassifyInput = {
  messageId: string
  userId: string
  agentId: string
  agentName: string
  conversationId: string
  question: string
  answer: string
}

export async function classifyMessage(input: ClassifyInput) {
  try {
    const question = input.question.trim()
    if (!question) return
    const openai = getOpenAI()
    if (!openai) return
    const admin = createAdminClient()

    const { data: topicRows } = await admin.from("topics").select("name").eq("is_active", true).order("sort")
    const names = (topicRows ?? []).map((t) => t.name)
    if (!names.includes("Outros")) names.push("Outros")
    const schema = z.object({
      tema: z.enum(names as [string, ...string[]]),
      subtema: z.string().describe("Subtema específico em 2 a 5 palavras"),
      resumo_pergunta: z.string().describe(`A pergunta ${pub.do} ${pub.um} resumida em uma frase curta, sem dados pessoais`),
      usuario_confuso: z.boolean().describe(`${pub.O} ${pub.um} demonstra confusão ou que não entendeu algo`),
    })

    const res = await openai.responses.parse({
      model: serverEnv.OPENAI_MODEL,
      instructions: [
        `Você classifica perguntas de ${pub.varios} feitas ao agente "${input.agentName}" de ${appConfig.context}.`,
        "Escolha o tema da lista que melhor descreve a pergunta. Se nenhum servir, use Outros.",
        "Resuma a pergunta em uma frase curta, sem nomes, e-mails, telefones ou valores pessoais.",
      ].join("\n"),
      input: `Pergunta ${pub.do} ${pub.um}:\n${question.slice(0, 3000)}\n\nResposta do agente (trecho):\n${input.answer.slice(0, 1200)}`,
      text: { format: zodTextFormat(schema, "classificacao") },
      max_output_tokens: 800,
      store: false,
    })
    const out = res.output_parsed
    if (!out) return

    // sinais de dificuldade
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [{ count: repeated }, { count: userMsgs }] = await Promise.all([
      admin
        .from("message_insights")
        .select("id", { count: "exact", head: true })
        .eq("user_id", input.userId)
        .eq("topic", out.tema)
        .neq("message_id", input.messageId)
        .gte("created_at", since),
      admin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", input.conversationId)
        .eq("role", "user"),
    ])

    const confused = hasConfusion(question) || out.usuario_confuso
    const isGap = isGapAnswer(input.answer)
    let signal = 0
    if (confused) signal += 1
    if ((repeated ?? 0) >= 1) signal += 1
    if ((repeated ?? 0) >= 3) signal += 1
    if ((userMsgs ?? 0) >= LONG_CONVERSATION_USER_MESSAGES) signal += 1
    if (isGap) signal += 1

    // regerar a resposta reclassifica a mesma pergunta
    await admin.from("message_insights").delete().eq("message_id", input.messageId)
    const { error } = await admin.from("message_insights").insert({
      message_id: input.messageId,
      user_id: input.userId,
      agent_id: input.agentId,
      topic: out.tema,
      subtopic: out.subtema.slice(0, 120) || null,
      difficulty_signal: signal,
      is_gap: isGap,
      question_summary: out.resumo_pergunta.slice(0, 300) || null,
    })
    if (error) console.error(`[classify] falha ao gravar: ${error.code}`)
  } catch (err) {
    logAIError("classify", err)
  }
}
