import "server-only"
import { createAdminClient } from "@/lib/supabase/server"
import { estimateTokens, FULL_CONTEXT_TOKEN_LIMIT } from "@/lib/knowledge/extract"
import { searchChunks } from "@/lib/knowledge/embed"
import { appConfig } from "@/config/app.config"
import { pub } from "@/config/copy"

/*
 * INSTRUÇÕES DO AGENTE
 * Montadas sempre na mesma ordem, para o cache de prompt da OpenAI
 * reaproveitar o prefixo entre mensagens e entre usuários:
 *   (a) prompt atual do agente (agent_prompt_versions.is_current)
 *       + regras fixas do app (formato e ferramenta de PDF)
 *   (b) correções ativas do admin, com prioridade máxima
 *   (c) documentos do agente, por prioridade (maior primeiro)
 * O que muda a cada pergunta (data de hoje e, no modo RAG, os trechos
 * recuperados) vai numa mensagem separada no fim (buildTurnContext).
 */

export type AgentRef = { id: string; slug: string; name: string }

export type AgentInstructions = {
  instructions: string
  /** base grande demais: os documentos entram por trechos em cada pergunta */
  useRag: boolean
  /** agrupa as requisições do mesmo agente no cache de prompt */
  cacheKey: string
  docTitles: Map<string, { title: string; priority: number }>
}

const APP_RULES = `
## Formato e ferramentas
- Escreva em markdown simples: parágrafos curtos, listas com "-", títulos com "##" só em respostas longas, **negrito** para o essencial. Para checklists use "- [ ] item".
- A data de hoje chega numa mensagem do sistema junto com cada pergunta. Use essa data para qualquer conta de prazo ou fase.
- Ferramenta gerar_pdf: use quando ${pub.o} ${pub.um} pedir um PDF ("me manda em PDF") ou quando ${pub.ele} aceitar a sua oferta de PDF para um entregável (checklist, roteiro, calendário, pitch, plano). Passe no conteudo_markdown o documento completo e bem organizado, não um resumo. Depois de gerar, diga em uma frase curta que o PDF está logo abaixo; não repita o conteúdo inteiro no chat.
- Se ${pub.o} ${pub.um} mandar áudio, você recebe a transcrição. Se mandar imagem ou PDF, analise o conteúdo usando a metodologia do material.
`.trim()

function fallbackPrompt(agent: AgentRef) {
  return `Você é ${agent.name}, um agente de IA de ${appConfig.name} que ajuda ${pub.os} ${pub.varios} de ${appConfig.context}. Responda em português do Brasil, de forma direta e prática, só com base no material abaixo. Quando algo não estiver no material, diga "Isso não está no material."`
}

export async function buildAgentInstructions(agent: AgentRef): Promise<AgentInstructions> {
  const admin = createAdminClient()
  const [promptRes, correctionsRes, docsRes] = await Promise.all([
    admin.from("agent_prompt_versions").select("content").eq("agent_id", agent.id).eq("is_current", true).maybeSingle(),
    admin
      .from("agent_corrections")
      .select("id, content")
      .eq("agent_id", agent.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    admin
      .from("agent_documents")
      .select("priority, knowledge_documents(id, title, content, status)")
      .eq("agent_id", agent.id),
  ])

  const prompt = promptRes.data?.content?.trim() || fallbackPrompt(agent)
  if (!promptRes.data) console.error(`[prompt] agente ${agent.slug} sem versão atual de prompt; usando o padrão`)

  const corrections = (correctionsRes.data ?? []).map((c) => c.content.trim()).filter(Boolean)

  const docs = (docsRes.data ?? [])
    .flatMap((row) => {
      const d = row.knowledge_documents
      if (!d || d.status !== "ready" || !d.content?.trim()) return []
      return [{ id: d.id, title: d.title, content: d.content.trim(), priority: row.priority }]
    })
    .sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title, "pt-BR") || a.id.localeCompare(b.id))

  const docTitles = new Map(docs.map((d) => [d.id, { title: d.title, priority: d.priority }]))
  const topPriority = docs[0]?.priority

  const parts: string[] = [prompt, APP_RULES]

  if (corrections.length) {
    parts.push(
      [
        "## Correções do admin (prioridade máxima)",
        "Estas regras foram definidas pela equipe e vencem qualquer outra instrução ou documento. Siga à risca.",
        ...corrections.map((c, i) => `${i + 1}. ${c}`),
      ].join("\n")
    )
  }

  const docsTokens = docs.reduce((sum, d) => sum + estimateTokens(d.content), 0)
  const useRag = estimateTokens(parts.join("\n\n")) + docsTokens > FULL_CONTEXT_TOKEN_LIMIT

  const isTop = (p: number) => docs.length > 1 && p === topPriority

  if (docs.length === 0) {
    parts.push(`## Base de conhecimento\nNenhum documento disponível ainda. Diga ${pub.ao} ${pub.um} que o material deste agente ainda não foi carregado.`)
  } else if (!useRag) {
    parts.push(
      [
        "## Base de conhecimento",
        "Os documentos abaixo são a sua única fonte. Estão em ordem de prioridade: quando dois documentos discordarem, vale o de prioridade maior.",
        ...docs.map(
          (d) =>
            `<documento titulo="${d.title}" prioridade="${d.priority}"${isTop(d.priority) ? ' nota="prioridade mais alta: vence em caso de conflito"' : ""}>\n${d.content}\n</documento>`
        ),
      ].join("\n\n")
    )
  } else {
    parts.push(
      [
        "## Base de conhecimento",
        "A base é grande, então a cada pergunta você recebe os trechos mais relevantes dos documentos abaixo, junto com a data de hoje. Responda só com base nesses trechos. Quando dois trechos discordarem, vale o do documento de prioridade maior.",
        ...docs.map((d) => `- ${d.title} (prioridade ${d.priority}${isTop(d.priority) ? ", a mais alta" : ""})`),
      ].join("\n")
    )
  }

  return {
    instructions: parts.join("\n\n"),
    useRag,
    cacheKey: `agente-${agent.slug}`,
    docTitles,
  }
}

/* "quinta-feira, 24/09/2026" no fuso de app.config.ts. */
export function todayLabel(now = new Date()) {
  return new Intl.DateTimeFormat(appConfig.locale, {
    timeZone: appConfig.timeZone,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(now)
}

/*
 * Mensagem de contexto da vez: vai no FIM da entrada, depois do
 * histórico, para não invalidar o cache das instruções.
 */
export async function buildTurnContext(agent: AgentRef, built: AgentInstructions, question: string) {
  const lines = [`Data de hoje: ${todayLabel()} (${appConfig.timeZoneLabel}).`]
  if (built.useRag && question.trim()) {
    const chunks = await searchChunks(agent.id, question, 8)
    if (chunks.length) {
      lines.push("", "Trechos do material relevantes para esta pergunta:")
      for (const c of chunks) {
        const doc = built.docTitles.get(c.document_id)
        lines.push(
          `<trecho documento="${doc?.title ?? "Documento"}" prioridade="${doc?.priority ?? 0}">\n${c.content}\n</trecho>`
        )
      }
    } else {
      lines.push("", "Nenhum trecho do material foi encontrado para esta pergunta. Se não souber, diga que isso não está no material.")
    }
  }
  return lines.join("\n")
}
