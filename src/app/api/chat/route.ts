import { createHash } from "node:crypto"
import { after } from "next/server"
import { z } from "zod"
import type {
  Response as OpenAIResponse,
  ResponseFunctionToolCall,
  ResponseInputItem,
} from "openai/resources/responses/responses"
import { toResponseInputItems } from "openai/lib/responses/ResponseInputItems"
import { getActiveUser } from "@/lib/auth/session"
import { createAdminClient, createClient } from "@/lib/supabase/server"
import { serverEnv } from "@/lib/env.server"
import { encodeEvent, UPLOAD_LIMITS, type ChatEvent } from "@/lib/chat/contract"
import { friendlyAIError, getOpenAI, isAbortError, logAIError, MISSING_KEY_MESSAGE } from "@/lib/ai/openai"
import { checkDailyLimit, recordUsage } from "@/lib/ai/limits"
import { buildAgentInstructions, buildTurnContext } from "@/lib/ai/prompt"
import { buildHistory } from "@/lib/ai/history"
import { createGeneratedPdf, GERAR_PDF_TOOL, gerarPdfArgs } from "@/lib/ai/tools"
import { DEFAULT_CONVERSATION_TITLE, generateTitle } from "@/lib/ai/title"
import { classifyMessage } from "@/lib/ai/classify"
import { deleteAssistantMessage } from "@/lib/ai/messages"
import { pub } from "@/config/copy"

/*
 * POST /api/chat  (contrato em src/lib/chat/contract.ts)
 * Erros antes do stream (entrada inválida, sem login, conversa ou agente
 * inexistente) voltam como JSON { error } com status 400/401/404/500.
 * Limite diário e falta da chave da OpenAI voltam como stream com um
 * único evento "error". Depois disso, tudo chega como eventos SSE.
 */

export const runtime = "nodejs"
// resposta longa + gerar PDF + título: até 5 min (a classificação roda depois, via after)
export const maxDuration = 300

const MAX_TOOL_ROUNDS = 3

const bodySchema = z.object({
  conversationId: z.uuid().optional(),
  agentSlug: z.string().trim().min(1).max(80),
  message: z.string().max(20_000).default(""),
  attachmentIds: z.array(z.uuid()).max(UPLOAD_LIMITS.filesPerMessage).optional(),
  regenerate: z.boolean().optional(),
})

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
}

function jsonError(status: number, error: string) {
  return Response.json({ error }, { status })
}

function singleEvent(event: ChatEvent) {
  return new Response(encodeEvent(event), { headers: SSE_HEADERS })
}

type FinalResult = {
  status: "complete" | "stopped" | "error"
  text: string
  question: string
}

export async function POST(request: Request) {
  // 1. entrada
  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return jsonError(400, "Pedido inválido. Atualize a página e tente de novo.")
  }
  if (!body.regenerate && !body.message.trim() && !body.attachmentIds?.length) {
    return jsonError(400, "Escreva uma mensagem ou envie um anexo.")
  }

  // 2. quem está chamando
  const session = await getActiveUser()
  if (!session) return jsonError(401, "Faça login para continuar.")
  const userId = session.user.id

  // 3. chave e limite diário
  const openai = getOpenAI()
  if (!openai) return singleEvent({ type: "error", message: MISSING_KEY_MESSAGE })
  const limitMessage = await checkDailyLimit(userId, "messages")
  if (limitMessage) return singleEvent({ type: "error", message: limitMessage })

  const supabase = await createClient()
  const admin = createAdminClient()

  // 4. conversa (RLS confere o dono) e agente
  let conversation: { id: string; agent_id: string; title: string } | null = null
  if (body.conversationId) {
    const { data } = await supabase
      .from("conversations")
      .select("id, agent_id, title, user_id, deleted_at")
      .eq("id", body.conversationId)
      .maybeSingle()
    if (!data || data.user_id !== userId || data.deleted_at) return jsonError(404, "Conversa não encontrada.")
    conversation = data
  }

  const agentQuery = admin.from("agents").select("id, slug, name, is_active")
  const { data: agent } = conversation
    ? await agentQuery.eq("id", conversation.agent_id).maybeSingle()
    : await agentQuery.eq("slug", body.agentSlug).maybeSingle()
  if (!agent || !agent.is_active) return jsonError(404, "Este agente não está disponível.")

  if (!conversation) {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ agent_id: agent.id, user_id: userId })
      .select("id, agent_id, title")
      .single()
    if (error || !data) return jsonError(500, "Não consegui criar a conversa. Tente de novo.")
    conversation = data
  }
  const conv = conversation

  // 5. mensagem do usuário (ou refazer a última resposta)
  let userMessageId: string | null = null
  let questionMessageId: string
  if (body.regenerate) {
    const { data: last } = await admin
      .from("messages")
      .select("id, role")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(2)
    const rows = last ?? []
    if (rows[0]?.role === "assistant") await deleteAssistantMessage(rows[0].id)
    const lastUser = rows.find((r) => r.role === "user")
    if (!lastUser) return jsonError(400, "Não há mensagem para responder de novo.")
    questionMessageId = lastUser.id
  } else {
    const { data: userMsg, error } = await admin
      .from("messages")
      .insert({ conversation_id: conv.id, user_id: userId, role: "user", content: body.message.trim() })
      .select("id")
      .single()
    if (error || !userMsg) return jsonError(500, "Não consegui salvar a sua mensagem. Tente de novo.")
    userMessageId = userMsg.id
    questionMessageId = userMsg.id

    if (body.attachmentIds?.length) {
      // só anexos do próprio usuário, ainda soltos, enviados por /api/uploads
      await admin
        .from("message_attachments")
        .update({ message_id: userMsg.id })
        .in("id", body.attachmentIds)
        .eq("user_id", userId)
        .is("message_id", null)
        .neq("kind", "generated_pdf")
    }
  }

  // 6. mensagem do agente (vazia, preenchida no fim)
  const model = serverEnv.OPENAI_MODEL
  const { data: assistantMsg, error: assistantErr } = await admin
    .from("messages")
    .insert({ conversation_id: conv.id, user_id: userId, role: "assistant", content: "", status: "streaming", model })
    .select("id")
    .single()
  if (assistantErr || !assistantMsg) return jsonError(500, "Não consegui iniciar a resposta. Tente de novo.")
  const assistantMessageId = assistantMsg.id

  // parar: o navegador aborta o fetch (request.signal) ou cancela o stream
  const abort = new AbortController()
  request.signal.addEventListener("abort", () => abort.abort(), { once: true })

  // classificação depois da resposta, sem atrasar o usuário (e mantém a função viva até gravar tudo)
  let finish!: (r: FinalResult) => void
  const finished = new Promise<FinalResult>((resolve) => (finish = resolve))
  after(async () => {
    const result = await finished
    if (result.status === "error" || !result.question.trim()) return
    await classifyMessage({
      messageId: questionMessageId,
      userId,
      agentId: agent.id,
      agentName: agent.name,
      conversationId: conv.id,
      question: result.question,
      answer: result.text,
    })
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      const send = (event: ChatEvent) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(encodeEvent(event)))
        } catch {
          closed = true
        }
      }

      let text = ""
      let question = ""
      let tokensIn = 0
      let tokensOut = 0
      let status: FinalResult["status"] = "complete"
      let titlePromise: Promise<string | null> = Promise.resolve(null)

      try {
        send({ type: "meta", conversationId: conv.id, userMessageId, assistantMessageId })
        send({ type: "status", label: "Lendo o material" })

        const [built, history] = await Promise.all([
          buildAgentInstructions(agent),
          buildHistory(conv.id, assistantMessageId),
        ])
        question = history.lastUserText
        if (history.priorAssistantCount === 0 && conv.title === DEFAULT_CONVERSATION_TITLE && question) {
          titlePromise = generateTitle(question, abort.signal).catch(() => null)
        }

        const turnContext = await buildTurnContext(agent, built, question)
        const input: ResponseInputItem[] = [...history.input, { role: "developer", content: turnContext }]
        const safetyId = createHash("sha256").update(userId).digest("hex").slice(0, 32)

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const lastRound = round === MAX_TOOL_ROUNDS - 1
          const events = await openai.responses.create(
            {
              model,
              instructions: built.instructions,
              input,
              tools: [GERAR_PDF_TOOL],
              tool_choice: lastRound ? "none" : "auto",
              parallel_tool_calls: false,
              prompt_cache_key: built.cacheKey,
              safety_identifier: safetyId,
              store: false,
              include: ["reasoning.encrypted_content"],
              stream: true,
            },
            { signal: abort.signal }
          )

          let final: OpenAIResponse | null = null
          let roundStarted = false
          for await (const ev of events) {
            if (ev.type === "response.output_text.delta") {
              let delta = ev.delta
              if (!roundStarted && text && round > 0) delta = `\n\n${delta}`
              roundStarted = true
              text += delta
              send({ type: "delta", text: delta })
            } else if (ev.type === "response.output_item.added" && ev.item.type === "function_call") {
              send({ type: "status", label: "Gerando PDF" })
            } else if (ev.type === "response.completed" || ev.type === "response.incomplete") {
              final = ev.response
            } else if (ev.type === "response.failed") {
              throw new Error(`response.failed: ${ev.response.error?.code ?? "desconhecido"}`)
            } else if (ev.type === "error") {
              throw new Error(`stream error: ${ev.code ?? "desconhecido"}`)
            }
          }
          if (!final) throw new Error("stream terminou sem resposta final")
          tokensIn += final.usage?.input_tokens ?? 0
          tokensOut += final.usage?.output_tokens ?? 0

          const calls = final.output.filter((o): o is ResponseFunctionToolCall => o.type === "function_call")
          if (calls.length === 0 || lastRound) break

          input.push(...toResponseInputItems(final.output))
          for (const call of calls) {
            const output = await runTool(call, { userId, assistantMessageId, agentName: agent.name, send })
            input.push({ type: "function_call_output", call_id: call.call_id, output })
          }
        }
      } catch (err) {
        if (abort.signal.aborted || isAbortError(err)) {
          status = "stopped"
        } else {
          status = "error"
          logAIError("chat", err)
          send({ type: "error", message: friendlyAIError(err) })
        }
      }

      // grava a resposta (parcial, se parou); o finally garante fechar o stream e liberar o after
      try {
        const { error: saveErr } = await admin
          .from("messages")
          .update({ content: text, status, model, tokens_in: tokensIn || null, tokens_out: tokensOut || null })
          .eq("id", assistantMessageId)
        if (saveErr) console.error(`[chat] falha ao gravar a resposta: ${saveErr.code}`)

        let title: string | undefined
        if (status !== "error") {
          title = (await titlePromise) ?? undefined
        }
        await admin
          .from("conversations")
          .update(title ? { title, updated_at: new Date().toISOString() } : { updated_at: new Date().toISOString() })
          .eq("id", conv.id)

        await recordUsage(userId, "message", {
          agent_id: agent.id,
          conversation_id: conv.id,
          message_id: assistantMessageId,
          status,
          regenerate: Boolean(body.regenerate),
          tokens_in: tokensIn,
          tokens_out: tokensOut,
        })

        if (status !== "error") send({ type: "done", ...(title ? { title } : {}) })
      } catch (err) {
        logAIError("chat-save", err)
      } finally {
        if (!closed) {
          try {
            controller.close()
          } catch {
            // já fechado pelo navegador
          }
        }
        finish({ status, text, question })
      }
    },
    cancel() {
      abort.abort()
    },
  })

  return new Response(stream, { headers: SSE_HEADERS })
}

async function runTool(
  call: ResponseFunctionToolCall,
  ctx: { userId: string; assistantMessageId: string; agentName: string; send: (e: ChatEvent) => void }
): Promise<string> {
  if (call.name !== GERAR_PDF_TOOL.name) {
    return JSON.stringify({ ok: false, motivo: "Ferramenta desconhecida." })
  }
  try {
    const args = gerarPdfArgs.safeParse(JSON.parse(call.arguments || "{}"))
    if (!args.success) return JSON.stringify({ ok: false, motivo: "Argumentos inválidos: envie titulo e conteudo_markdown." })
    const result = await createGeneratedPdf({
      userId: ctx.userId,
      messageId: ctx.assistantMessageId,
      title: args.data.titulo,
      markdown: args.data.conteudo_markdown,
      agentName: ctx.agentName,
    })
    if (!result.ok) return JSON.stringify({ ok: false, motivo: result.reason })
    ctx.send({ type: "attachment", attachment: result.pdf })
    return JSON.stringify({
      ok: true,
      titulo: result.pdf.title,
      observacao: `O PDF já aparece para ${pub.o} ${pub.um} como cartão de download logo abaixo da sua mensagem. Não repita o conteúdo.`,
    })
  } catch (err) {
    logAIError("gerar_pdf", err)
    return JSON.stringify({ ok: false, motivo: "Falha ao gerar o PDF. Ofereça a resposta em texto." })
  }
}
