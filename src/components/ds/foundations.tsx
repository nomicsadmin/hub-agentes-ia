"use client"

import { useState } from "react"
import {
  ArrowUpIcon,
  ChatCircleIcon,
  CompassIcon,
  CopyIcon,
  ExportIcon,
  GearSixIcon,
  GlobeIcon,
  MagnifyingGlassIcon,
  MicrophoneIcon,
  NotePencilIcon,
  PaperclipIcon,
  PenNibIcon,
  PlusIcon,
  SidebarSimpleIcon,
  ThumbsUpIcon,
  ArrowClockwiseIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { LoadingState } from "@/components/chat/loading-state"
import { StreamingText } from "@/components/chat/streaming-text"
import { Block, Section, Spec, Stage } from "./frame"

type Swatch = { token: string; name: string; light: string; dark: string; role: string }

const SURFACES: Swatch[] = [
  { token: "--canvas", name: "Canvas", light: "#ffffff", dark: "#212121", role: "Área da conversa" },
  { token: "--rail", name: "Rail", light: "#f9f9f9", dark: "#181818", role: "Barra lateral" },
  { token: "--surface", name: "Surface", light: "#ffffff", dark: "#303030", role: "Menus, compositor, painéis" },
  { token: "--bubble", name: "Bubble", light: "#f4f4f4", dark: "#303030", role: "Mensagem do usuário, código" },
  { token: "--edge", name: "Edge", light: "#e6e6e6", dark: "#3a3a3a", role: "Trilhos inativos" },
]

const INKS: Swatch[] = [
  { token: "--ink", name: "Ink", light: "#0d0d0d", dark: "#ececec", role: "Texto e ícones principais" },
  { token: "--ink-2", name: "Ink 2", light: "#5d5d5d", dark: "#b4b4b4", role: "Secundário, metadados" },
  { token: "--ink-3", name: "Ink 3", light: "#6e6e6e", dark: "#9b9b9b", role: "Ajuda, placeholder" },
  { token: "--ink-4", name: "Ink 4", light: "#8f8f8f", dark: "#6b6b6b", role: "Desabilitado, nunca leitura" },
]

const LINES: Swatch[] = [
  { token: "--line", name: "Line", light: "preto 10%", dark: "branco 10%", role: "A única divisória" },
  { token: "--line-strong", name: "Line strong", light: "preto 15%", dark: "branco 18%", role: "Borda em foco" },
  { token: "--hover", name: "Hover", light: "preto 5%", dark: "branco 6%", role: "Véu de hover" },
  { token: "--press", name: "Press", light: "preto 8%", dark: "branco 10%", role: "Item ativo" },
  { token: "--tooltip", name: "Tooltip", light: "#000000", dark: "#000000", role: "Dica, o único preto puro" },
  { token: "--danger", name: "Danger", light: "#c42b26", dark: "#ff7a70", role: "Só destrutivo e erro" },
]

function SwatchRow({ items }: { items: Swatch[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((s) => (
        <div key={s.token} className="flex flex-col gap-2.5">
          <div className="h-16 rounded-control border border-line" style={{ background: `var(${s.token})` }} />
          <div className="flex flex-col gap-0.5">
            <span className="text-ui font-medium text-ink">{s.name}</span>
            <span className="text-micro text-ink-2">{s.role}</span>
            <Spec>
              {s.light} / {s.dark}
            </Spec>
          </div>
        </div>
      ))}
    </div>
  )
}

const TYPE = [
  { name: "Display", spec: "24 / 32 · 600", cls: "text-display font-semibold", sample: "Por onde começamos?" },
  { name: "Título de resposta", spec: "20 / 28 · 600", cls: "text-h2 font-semibold", sample: "Três direções para a página de inscrição" },
  { name: "Subtítulo", spec: "18 / 26 · 600", cls: "text-h3 font-semibold", sample: "Opção 1: a dor que o público já vive" },
  {
    name: "Corpo",
    spec: "16 / 26 · 400",
    cls: "text-body leading-[1.625]",
    sample: "Seu negócio é bom. O problema é que só quem passa na porta sabe disso. A resposta do agente é o conteúdo principal da tela, então o corpo tem 16px e entrelinha folgada.",
  },
  { name: "Interface", spec: "14 / 20 · 400 e 500", cls: "text-ui", sample: "Novo chat · Buscar conversas · Compartilhar" },
  { name: "Meta", spec: "13 / 18 · 500", cls: "text-meta font-medium text-ink-2", sample: "Pensou por 4,2 s" },
  { name: "Micro", spec: "12 / 16 · 400", cls: "text-micro text-ink-3", sample: "Os agentes podem errar. Confira informações importantes." },
  { name: "Mono", spec: "13 / 20 · código e medidas", cls: "font-mono text-[13px]", sample: "const prazo = 7 // dias até a abertura" },
]

const SPACE = [6, 8, 10, 12, 16, 20, 24, 40]

const RADII = [
  { r: "6px", name: "Linha de menu", cls: "rounded-row" },
  { r: "10px", name: "Controles e cards", cls: "rounded-control" },
  { r: "16px", name: "Painéis e diálogos", cls: "rounded-2xl" },
  { r: "18px", name: "Balão do usuário", cls: "rounded-[18px]" },
  { r: "28px", name: "Compositor", cls: "rounded-[28px]" },
  { r: "pílula", name: "Chips e envio", cls: "rounded-full" },
  { r: "0px", name: "Selos", cls: "rounded-none" },
]

const ICONS = [
  { i: <NotePencilIcon />, n: "Novo chat" },
  { i: <MagnifyingGlassIcon />, n: "Buscar" },
  { i: <SidebarSimpleIcon />, n: "Barra lateral" },
  { i: <CompassIcon />, n: "Explorar" },
  { i: <ChatCircleIcon />, n: "Conversa" },
  { i: <PlusIcon />, n: "Adicionar" },
  { i: <PaperclipIcon />, n: "Anexar" },
  { i: <GlobeIcon />, n: "Web" },
  { i: <MicrophoneIcon />, n: "Ditar" },
  { i: <ArrowUpIcon />, n: "Enviar" },
  { i: <CopyIcon />, n: "Copiar" },
  { i: <ThumbsUpIcon />, n: "Avaliar" },
  { i: <ArrowClockwiseIcon />, n: "Refazer" },
  { i: <ExportIcon />, n: "Compartilhar" },
  { i: <PenNibIcon />, n: "Agente" },
  { i: <GearSixIcon />, n: "Ajustes" },
]

const MOTION = [
  { name: "Saída suave", value: "cubic-bezier(0.23, 1, 0.32, 1)", use: "Menus, destaque deslizante, chips" },
  { name: "Saída expo", value: "cubic-bezier(0.16, 1, 0.3, 1)", use: "Varredura do modelo Pro" },
  { name: "Streaming", value: "cubic-bezier(0.22, 1, 0.36, 1)", use: "Palavras da resposta" },
  { name: "Rápido", value: "100ms", use: "Hover, fechar menu" },
  { name: "Base", value: "150ms", use: "Cor e borda" },
  { name: "Menu", value: "180ms", use: "Abrir menus a partir do gatilho" },
  { name: "Deslize", value: "220ms", use: "Destaque que desliza entre linhas" },
  { name: "Palavra", value: "60ms / 350ms", use: "Intervalo e resolução do streaming" },
]

const STREAM_SAMPLE =
  "Para uma página de inscrição, a opção 1 costuma prender mais rápido porque nomeia a situação que o público já vive. As palavras se resolvem com um leve desfoque, sem parecer digitação."

export function Foundations() {
  const [streamKey, setStreamKey] = useState(0)
  return (
    <>
      <Section
        id="cor"
        title="Cor"
        intro="Grafite sobre papel. A interface é toda em tons de cinza: hierarquia vem do peso da fonte, do véu de hover e da posição. A cor aparece em um único momento, a varredura arco-íris ao escolher o modelo Pro."
      >
        <Block title="Superfícies" note="Três níveis planos. A barra lateral recua, a conversa fica no branco, o que flutua ganha uma linha fina.">
          <SwatchRow items={SURFACES} />
        </Block>
        <Block title="Tinta" note="Texto em grafite (#0d0d0d), nunca preto puro. Ink 3 foi escurecido em relação à ficha Refero (de #8f8f8f para #6e6e6e) para passar no contraste AA como texto de ajuda.">
          <SwatchRow items={INKS} />
        </Block>
        <Block title="Estrutura e estados" note="Transparências sobre a superfície, para funcionar em qualquer fundo. O vermelho é semântico: só aparece em ações destrutivas e erros.">
          <SwatchRow items={LINES} />
        </Block>
      </Section>

      <Section
        id="tipografia"
        title="Tipografia"
        intro="A fonte do sistema operacional (SF no Mac e no iPhone, Segoe no Windows). Nenhuma fonte baixada: carrega instantâneo e parece nativo. O maior tamanho da interface é 24px."
      >
        <Stage className="flex flex-col divide-y divide-line p-0!">
          {TYPE.map((t) => (
            <div key={t.name} className="grid gap-1 px-6 py-5 max-sm:px-4 sm:grid-cols-[180px_1fr] sm:gap-6">
              <div className="flex flex-col">
                <span className="text-ui font-medium text-ink">{t.name}</span>
                <Spec>{t.spec}</Spec>
              </div>
              <p className={`${t.cls} max-w-[62ch]`}>{t.sample}</p>
            </div>
          ))}
        </Stage>
      </Section>

      <Section
        id="espaco"
        title="Espaço, raio e elevação"
        intro="Densidade compacta: 6px entre elementos, 24px entre seções. Elevação é sempre uma linha de 1px, nunca sombra."
      >
        <Block title="Espaçamento">
          <div className="flex flex-wrap items-end gap-5">
            {SPACE.map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <div className="w-6 rounded-[3px] bg-ink/80" style={{ height: s }} />
                <Spec>{s}</Spec>
              </div>
            ))}
          </div>
        </Block>
        <Block title="Raios" note="Uma regra por tipo de peça. Controles e cards usam 10px; a conversa ganha curvas maiores; selos ficam retos de propósito.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {RADII.map((r) => (
              <div key={r.name} className="flex flex-col gap-2">
                <div className={`h-16 border border-line-strong bg-bubble ${r.cls}`} />
                <span className="text-meta font-medium text-ink">{r.r}</span>
                <span className="-mt-1.5 text-micro text-ink-3">{r.name}</span>
              </div>
            ))}
          </div>
        </Block>
        <Block title="Elevação" note="Um painel sobe por uma linha de 1px. No escuro, a própria superfície clareia (#303030 sobre #212121).">
          <Stage tone="rail" className="flex flex-wrap gap-4">
            <div className="flex h-24 w-48 items-end rounded-control bg-rail p-3 text-micro text-ink-3">Nível 0 · rail</div>
            <div className="flex h-24 w-48 items-end rounded-control bg-canvas p-3 text-micro text-ink-3">Nível 1 · canvas</div>
            <div className="flex h-24 w-48 items-end rounded-control border border-line bg-surface p-3 text-micro text-ink-3">Nível 2 · painel</div>
          </Stage>
        </Block>
      </Section>

      <Section
        id="movimento"
        title="Movimento"
        intro="O movimento responde a uma ação ou mostra trabalho em andamento. Nada se mexe só para enfeitar, e tudo para quando o sistema pede menos movimento."
      >
        <Block
          title="Estado de carregamento"
          note="Grade de pixels 3×3 com rótulo brilhando e cronômetro. Drive é o padrão para o agente pensando; Dots e Orbit ficam para tarefas longas em segundo plano."
        >
          <Stage className="flex flex-wrap items-center gap-x-10 gap-y-5">
            <LoadingState label="Pensando" variant="drive" />
            <LoadingState label="Lendo arquivos" variant="dots" />
            <LoadingState label="Gerando roteiro" variant="orbit" />
          </Stage>
        </Block>
        <Block title="Texto em streaming" note="Cada palavra se resolve de um desfoque de 1px em 350ms, uma a cada 60ms.">
          <Stage className="flex flex-col items-start gap-4">
            <div className="max-w-[62ch] text-body leading-[1.625]">
              <StreamingText key={streamKey} text={STREAM_SAMPLE} />
            </div>
            <Button variant="secondary" size="sm" onClick={() => setStreamKey((k) => k + 1)}>
              <ArrowClockwiseIcon />
              Repetir
            </Button>
          </Stage>
        </Block>
        <Block title="Tokens de movimento">
          <div className="grid gap-x-8 sm:grid-cols-2">
            {MOTION.map((m) => (
              <div key={m.name} className="flex items-baseline justify-between gap-4 border-b border-line py-2.5">
                <span className="text-ui text-ink">
                  {m.name}
                  <span className="ml-2 text-meta text-ink-3">{m.use}</span>
                </span>
                <Spec>{m.value}</Spec>
              </div>
            ))}
          </div>
        </Block>
      </Section>

      <Section id="icones" title="Ícones" intro="Phosphor, traço regular, 18px na interface e 20px nos botões de 36px. Uma família só, sempre monocromática.">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {ICONS.map((ic) => (
            <div key={ic.n} className="flex flex-col items-center gap-2 rounded-control py-4 text-ink transition-colors hover:bg-hover">
              {ic.i}
              <span className="text-micro text-ink-3">{ic.n}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}
