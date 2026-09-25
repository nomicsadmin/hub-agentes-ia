"use client"

import { useEffect, useState } from "react"
import { ArrowClockwiseIcon, CaretDownIcon, NotePencilIcon, MagnifyingGlassIcon, CompassIcon } from "@phosphor-icons/react"
import type { Palette } from "glimm"
import { Button } from "@/components/ui/button"
import { PromptBar } from "@/components/chat/prompt-bar"
import { AssistantActions, AssistantMessage, MessageError, UserMessage } from "@/components/chat/messages"
import { DecisionCard, FollowUps, Reasoning, SourceChip, Sources, type Step } from "@/components/chat/agent-work"
import { StreamingBlocks } from "@/components/chat/streaming-text"
import { CodeBlock } from "@/components/chat/code-block"
import { AGENT_ICONS, RailItem } from "@/components/shell/sidebar"
import { AGENTS, DEMO_STEPS, SEED_ANSWER, SEED_FOLLOWUPS, SEED_QUESTION, SEED_STEPS, blocksToText } from "@/lib/demo"
import { Block, Section, Stage } from "./frame"

/* Raciocínio ao vivo em loop, só para demonstração. */
function LiveReasoning() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => (n + 1) % (DEMO_STEPS.length + 1)), 1400)
    return () => clearInterval(t)
  }, [])
  const steps: Step[] = DEMO_STEPS.map((s, i) => ({ ...s, done: i < tick }))
  return <Reasoning key={tick === 0 ? "reset" : "run"} steps={steps} thinking />
}

function StreamingDemo() {
  const [run, setRun] = useState(0)
  return (
    <div className="flex flex-col items-start gap-4">
      <StreamingBlocks key={run} blocks={SEED_ANSWER} />
      <Button variant="secondary" size="sm" onClick={() => setRun((r) => r + 1)}>
        <ArrowClockwiseIcon />
        Repetir resposta
      </Button>
    </div>
  )
}

const COPY = {
  grafite: {
    prompt: "Digite @ para fontes e arquivos, / para comandos. Troque o modelo para Pro e veja o único momento de cor do sistema. Enviar vira parar enquanto o agente responde.",
    messages: "Usuário: balão cinza à direita, até 70% da largura, ações no hover. Agente: texto corrido, ações no fim da resposta.",
  },
}

export function ChatPatterns({ v = "grafite", sweep }: { v?: keyof typeof COPY; sweep?: Palette }) {
  const copy = COPY[v]
  return (
    <Section
      id="chat"
      title="Chat"
      intro="As peças da conversa. A resposta do agente não tem balão: o texto é a superfície. O trabalho do agente (pensar, consultar, pedir decisão) aparece em cinza, acima da resposta, sem competir com ela."
    >
      <Block
        title="Prompt Bar"
        note={copy.prompt}
      >
        <Stage className="flex flex-col gap-8 pt-44!">
          <PromptBar sweep={sweep} />
          <div className="flex flex-col gap-2">
            <span className="type-label text-meta text-ink-3">Tela inicial</span>
            <PromptBar hero sweep={sweep} placeholder="Pergunte ao Copywriter" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="type-label text-meta text-ink-3">Agente respondendo</span>
            <PromptBar streaming sweep={sweep} placeholder="Pergunte ao Copywriter" />
          </div>
        </Stage>
      </Block>

      <Block title="Mensagens" note={copy.messages}>
        <Stage className="flex flex-col gap-10">
          <UserMessage text={SEED_QUESTION}>{SEED_QUESTION}</UserMessage>
          <AssistantMessage>
            <Reasoning steps={SEED_STEPS} thinking={false} seconds={4.2} />
            <StreamingBlocks blocks={SEED_ANSWER} animate={false} />
            <p className="-mt-1 text-meta text-ink-3">
              Com base em
              <SourceChip label="Base do agente" />
              <SourceChip label="Pedido original" />
            </p>
            <AssistantActions text={blocksToText(SEED_ANSWER)} />
            <FollowUps items={SEED_FOLLOWUPS} />
          </AssistantMessage>
        </Stage>
      </Block>

      <div className="grid gap-12 lg:grid-cols-2">
        <Block title="Pensando" note="Etapas aparecem uma a uma enquanto o agente trabalha. Ao terminar, recolhem para “Pensou por 4,2 s”, que abre com um clique.">
          <Stage className="flex min-h-56 flex-col gap-8">
            <LiveReasoning />
            <Reasoning steps={SEED_STEPS} thinking={false} seconds={4.2} defaultOpen />
          </Stage>
        </Block>
        <Block title="Resposta em streaming" note="Parágrafos, listas e negrito entram palavra por palavra, no mesmo ritmo.">
          <Stage className="min-h-56">
            <StreamingDemo />
          </Stage>
        </Block>
      </div>

      <div className="grid gap-12 lg:grid-cols-2">
        <Block title="Decisão do usuário" note="O agente para e espera. Uma pergunta, opções com consequência escrita, e dois caminhos: continuar ou pular.">
          <Stage>
            <DecisionCard
              question="Qual headline sigo desenvolvendo?"
              options={[
                { title: "Opção 1: dor", detail: "Nomeia a situação que o público já vive" },
                { title: "Opção 2: ganho", detail: "Mostra o resultado sem abrir outra loja" },
                { title: "Opção 3: curiosidade", detail: "Abre uma pergunta para ser respondida na aula" },
              ]}
            />
          </Stage>
        </Block>
        <Block title="Fontes, código e erro" note="Fontes nomeiam de onde veio a resposta. Código não tem realce colorido. Erros dizem o que houve e como resolver.">
          <Stage className="flex flex-col gap-6">
            <Sources
              items={[
                { label: "Base do agente", detail: "3 materiais" },
                { label: "Página de inscrição", detail: "PDF anexado" },
              ]}
            />
            <CodeBlock
              language="json"
              code={`// configuração de exemplo de um agente\n{\n  "nome": "Copywriter",\n  "modelo": "pro",\n  "memoria": true\n}`}
            />
            <MessageError message="A conexão caiu antes do fim da resposta." onRetry={() => {}} />
          </Stage>
        </Block>
      </div>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,280px)_1fr]">
        <Block title="Barra lateral" note="Linhas transparentes; véu de 5% no hover, 8% na conversa aberta.">
          <div className="overflow-hidden rounded-panel border border-line bg-rail p-2">
            <div className="flex flex-col gap-px">
              <RailItem icon={<NotePencilIcon />} label="Novo chat" />
              <RailItem icon={<MagnifyingGlassIcon />} label="Buscar conversas" />
              <RailItem icon={<CompassIcon />} label="Explorar agentes" />
            </div>
            <p className="type-label px-2.5 pt-4 pb-1 text-meta font-medium text-ink-3">Agentes</p>
            <div className="flex flex-col gap-px">
              {AGENTS.map((a, i) => (
                <RailItem key={a.id} icon={AGENT_ICONS[a.icon]} label={a.name} active={i === 1} />
              ))}
            </div>
            <p className="type-label px-2.5 pt-4 pb-1 text-meta font-medium text-ink-3">Hoje</p>
            <RailItem label="Headlines da aula 1" />
            <RailItem label="Sequência de e-mails do evento" />
          </div>
        </Block>
        <Block title="Cabeçalho e escolha de agente" note="52px de altura. O nome do agente abre a troca; o resto do cabeçalho fica em cinza.">
          <div className="overflow-hidden rounded-panel border border-line bg-canvas">
            <div className="flex h-(--header-h) items-center gap-1 border-b border-line px-2">
              <span className="flex h-9 items-center gap-1.5 rounded-control px-2.5 text-h3 font-medium text-ink">
                Copywriter
                <CaretDownIcon weight="bold" className="size-3.5 text-ink-3" />
              </span>
            </div>
            <div className="flex flex-col items-center gap-6 px-6 py-14">
              <h3 className="type-display text-center text-display font-semibold text-ink">Por onde começamos?</h3>
              <div className="flex flex-wrap justify-center gap-2">
                {AGENTS.map((a, i) => (
                  <span
                    key={a.id}
                    className={
                      "flex h-9 items-center gap-2 rounded-full border px-3.5 text-ui [&_svg]:size-4 " +
                      (i === 1 ? "border-line-strong bg-hover text-ink" : "border-line text-ink-2")
                    }
                  >
                    {AGENT_ICONS[a.icon]}
                    {a.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Block>
      </div>
    </Section>
  )
}
