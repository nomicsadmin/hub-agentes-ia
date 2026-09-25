import type { StreamBlock } from "@/components/chat/streaming-text"
import type { Step } from "@/components/chat/agent-work"

/*
 * CONTEÚDO DE EXEMPLO
 * Nada aqui é real: nomes de agentes, conversas e respostas só
 * demonstram o Design System na página /design-system.
 */

export type Agent = { id: string; name: string; desc: string; icon: "strategy" | "copy" | "script" | "review" }

export const AGENTS: Agent[] = [
  { id: "estrategista", name: "Estrategista", desc: "Planeja a campanha e as etapas", icon: "strategy" },
  { id: "copywriter", name: "Copywriter", desc: "Escreve headlines, páginas e e-mails", icon: "copy" },
  { id: "roteirista", name: "Roteirista", desc: "Estrutura roteiros de vídeo e aula", icon: "script" },
  { id: "revisor", name: "Revisor", desc: "Revisa textos e aponta ajustes", icon: "review" },
]

export const RECENTS: { group: string; items: string[] }[] = [
  { group: "Hoje", items: ["Headlines da aula 1", "Sequência de e-mails do evento"] },
  { group: "Ontem", items: ["Roteiro do vídeo de abertura", "Revisão da página de inscrição"] },
  { group: "Últimos 7 dias", items: ["Planejamento da campanha de outubro", "Perguntas frequentes do checkout", "Ideias de conteúdo para stories"] },
]

export const SEED_QUESTION =
  "Escreva 3 headlines para a página de inscrição da aula 1. O público são donos de negócio local que ainda não vendem pela internet."

export const SEED_STEPS: Step[] = [
  { title: "Lendo o pedido", detail: "página de inscrição, aula 1", done: true },
  { title: "Consultando a base do agente", detail: "3 materiais relevantes", done: true },
  { title: "Escrevendo as opções", done: true },
]

export const SEED_ANSWER: StreamBlock[] = [
  { type: "p", text: "Aqui estão três direções, cada uma com um ângulo diferente para o mesmo público:" },
  {
    type: "ol",
    items: [
      "**Dor:** Seu negócio é bom. O problema é que só quem passa na porta sabe disso.",
      "**Ganho:** Venda para o bairro inteiro sem abrir uma segunda loja.",
      "**Curiosidade:** O que os negócios locais que vendem pela internet fazem diferente na primeira semana.",
    ],
  },
  { type: "p", text: "Para uma página de inscrição, a opção 1 costuma prender mais rápido porque nomeia a situação que o público já vive." },
]

export const SEED_FOLLOWUPS = [
  "Escreva a subheadline para a opção 1",
  "Adapte as três para um anúncio de 5 segundos",
  "Qual delas funciona melhor no WhatsApp?",
]

export const DEMO_STEPS: Step[] = [
  { title: "Lendo sua mensagem", done: false },
  { title: "Consultando a base do agente", detail: "materiais do agente", done: false },
  { title: "Escrevendo a resposta", done: false },
]

export const DEMO_ANSWER: StreamBlock[] = [
  { type: "p", text: "Entendi. Para chegar numa resposta útil, preciso de três informações antes:" },
  {
    type: "ul",
    items: [
      "Qual é o produto e quanto ele custa.",
      "Quem é o público e o que ele já tentou antes.",
      "Qual é a data do evento ou da abertura do carrinho.",
    ],
  },
  { type: "p", text: "Com isso eu monto a primeira versão e ajustamos juntos. Esta é uma resposta de exemplo do Design System." },
]

export const blocksToText = (blocks: StreamBlock[]) =>
  blocks
    .map((b) => ("items" in b ? b.items.map((it, i) => `${i + 1}. ${it}`).join("\n") : b.text))
    .join("\n\n")
    .replace(/\*\*/g, "")
