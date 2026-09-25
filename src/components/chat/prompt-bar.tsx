"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createShader, playSweep, accentChain, ACCENTS, type Palette } from "glimm"
import {
  ArrowUpIcon,
  BookOpenTextIcon,
  CaretDownIcon,
  ChatsCircleIcon,
  CheckIcon,
  FileTextIcon,
  GlobeIcon,
  GoogleDriveLogoIcon,
  MicrophoneIcon,
  PaperclipIcon,
  PlusIcon,
  StopIcon,
  XIcon,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Tip } from "@/components/ui/tooltip"

/* ─────────────────────────────────────────────────────────
 * PROMPT BAR: o compositor
 * Adaptado de beautifului.dev (Prompt Bar).
 *   + ou @  abre fontes e anexos
 *   /       abre comandos
 *   ↑↓ e Enter escolhem; Esc fecha
 *   modelo  escolher o Pro dispara a varredura arco-íris,
 *           o único momento de cor do sistema
 *   enviar  vira "parar" enquanto o agente responde
 * ───────────────────────────────────────────────────────── */

/* Arco-íris completo, não só ciano→magenta. Fixado para ser igual sempre. */
const RAINBOW = accentChain([
  ACCENTS.red,
  ACCENTS.orange,
  ACCENTS.yellow,
  ACCENTS.green,
  ACCENTS.cyan,
  ACCENTS.blue,
  ACCENTS.purple,
])

type Source = {
  key: string
  name: string
  desc: string
  icon: React.ReactNode
  attach?: boolean
  connect?: boolean
}

/* Conteúdo de exemplo (usado na página /design-system). */
const SOURCES: Source[] = [
  { key: "attach", name: "Adicionar fotos e arquivos", desc: "Envie do seu computador", icon: <PaperclipIcon />, attach: true },
  { key: "base", name: "Base de conhecimento", desc: "Materiais do agente", icon: <BookOpenTextIcon /> },
  { key: "web", name: "Busca na web", desc: "Informações atuais", icon: <GlobeIcon /> },
  { key: "chats", name: "Conversas anteriores", desc: "Traga o contexto de outro chat", icon: <ChatsCircleIcon /> },
  { key: "drive", name: "Google Drive", desc: "Documentos e planilhas", icon: <GoogleDriveLogoIcon />, connect: true },
]

const COMMANDS = [
  { key: "headline", name: "/headline", desc: "Gerar variações de headline" },
  { key: "roteiro", name: "/roteiro", desc: "Estruturar um roteiro de vídeo" },
  { key: "revisar", name: "/revisar", desc: "Revisar um texto colado" },
  { key: "resumir", name: "/resumir", desc: "Resumir esta conversa" },
]

export type Model = { key: string; name: string; tag: string; flagship?: boolean }

export const MODELS: Model[] = [
  { key: "pro", name: "Pro", tag: "Mais capaz", flagship: true },
  { key: "padrao", name: "Padrão", tag: "Equilibrado" },
  { key: "rapido", name: "Rápido", tag: "Respostas curtas" },
]

const SAMPLE_FILES = ["pagina-de-vendas.pdf", "roteiro-aula-1.docx", "leads-setembro.csv"]

function parseToken(draft: string): { kind: "at" | "slash"; query: string; start: number } | null {
  const match = /(^|\s)([@/])([\p{L}\w-]*)$/u.exec(draft)
  if (!match) return null
  return {
    kind: match[2] === "@" ? "at" : "slash",
    query: match[3].toLowerCase(),
    start: match.index + match[1].length,
  }
}

type Row = { key: string; name: string; desc: string }

export function PromptBar({
  placeholder = "Pergunte qualquer coisa",
  hero = false,
  streaming = false,
  defaultModel = "padrao",
  onSend,
  onStop,
  autoFocus,
  sweep = RAINBOW,
  showModel = true,
  menus = true,
  onPlus,
  plusLabel = "Adicionar fontes e arquivos",
  plusActive = false,
  attachmentsSlot,
  hasPayload = false,
  sendDisabled = false,
  onMic,
  micLabel = "Gravar áudio",
}: {
  placeholder?: string
  /** tela inicial: campo mais alto, controles na linha de baixo */
  hero?: boolean
  /** o agente está respondendo: enviar vira parar */
  streaming?: boolean
  defaultModel?: string
  onSend?: (text: string, model: Model) => void
  onStop?: () => void
  autoFocus?: boolean
  /** paleta da varredura ao escolher o modelo principal (padrão: arco-íris) */
  sweep?: Palette
  /** false esconde a escolha de modelo (no app o modelo é definido no servidor) */
  showModel?: boolean
  /** false desliga os menus @ e / de demonstração */
  menus?: boolean
  /** uso real: o + chama esta função em vez do menu de demonstração */
  onPlus?: () => void
  plusLabel?: string
  /** o menu real do + está aberto */
  plusActive?: boolean
  /** uso real: prévia dos anexos, acima do campo */
  attachmentsSlot?: React.ReactNode
  /** há anexos prontos: pode enviar sem texto */
  hasPayload?: boolean
  /** bloqueia o envio (ex.: anexos ainda subindo) */
  sendDisabled?: boolean
  /** uso real: o microfone chama esta função em vez do ditado de demonstração */
  onMic?: () => void
  micLabel?: string
}) {
  const [draft, setDraft] = useState("")
  const [dismissed, setDismissed] = useState(false)
  const [plusOpen, setPlusOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [model, setModel] = useState(MODELS.find((m) => m.key === defaultModel) ?? MODELS[1])
  const [attachments, setAttachments] = useState<string[]>([])
  const [connected, setConnected] = useState(false)
  const [active, setActive] = useState(0)
  const [engaged, setEngaged] = useState(false)
  const [listening, setListening] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [rowBox, setRowBox] = useState<{ top: number; height: number } | null>(null)
  const [modelBox, setModelBox] = useState<{ top: number; height: number } | null>(null)
  const [modelHovered, setModelHovered] = useState<number | null>(null)
  const [modelMenuLeft, setModelMenuLeft] = useState(0)
  const [modelMenuBottom, setModelMenuBottom] = useState(0)

  const wide = expanded || hero
  const anchorRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const modelRef = useRef<HTMLButtonElement>(null)
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([])
  const modelRowRefs = useRef<(HTMLButtonElement | null)[]>([])
  const glimmRef = useRef<HTMLCanvasElement>(null)
  const shaderRef = useRef<ReturnType<typeof createShader> | null>(null)
  const sweepingRef = useRef(false)

  const token = dismissed || !menus ? null : parseToken(draft)
  const menu: "at" | "slash" | null = plusOpen ? "at" : (token?.kind ?? null)
  const query = plusOpen ? "" : (token?.query ?? "")

  const rows: Row[] =
    menu === "at"
      ? SOURCES.filter((s) => s.name.toLowerCase().includes(query))
      : menu === "slash"
        ? COMMANDS.filter((c) => c.name.slice(1).startsWith(query))
        : []

  /* menu ou busca mudou: volta o destaque para a primeira linha */
  const menuKey = `${menu}:${query}`
  const [prevMenuKey, setPrevMenuKey] = useState(menuKey)
  if (prevMenuKey !== menuKey) {
    setPrevMenuKey(menuKey)
    setActive(0)
    setEngaged(false)
  }

  /* um único destaque desliza até a linha ativa */
  useLayoutEffect(() => {
    const target = rowRefs.current[active]
    if (target) setRowBox({ top: target.offsetTop, height: target.offsetHeight })
  }, [menu, query, active, connected, rows.length])

  const modelIndex = MODELS.findIndex((m) => m.key === model.key)
  const hovered = modelOpen ? modelHovered : null
  useLayoutEffect(() => {
    if (!modelOpen) return
    const target = modelRowRefs.current[hovered ?? modelIndex]
    if (target) setModelBox({ top: target.offsetTop, height: target.offsetHeight })
  }, [modelOpen, hovered, modelIndex])

  /* o menu de modelo fica fora do compositor recortado: alinhar por medida */
  useLayoutEffect(() => {
    if (!modelOpen || !anchorRef.current || !modelRef.current) return
    const a = anchorRef.current.getBoundingClientRect()
    const t = modelRef.current.getBoundingClientRect()
    setModelMenuLeft(Math.max(0, Math.min(t.left - a.left, a.width - 224)))
    setModelMenuBottom(a.bottom - t.top + 8)
  }, [modelOpen, wide, model.name])


  /* Shader com fase de matiz fixa: createShader sorteia a fase com
   * Math.random, então fixamos para a varredura ser sempre igual. */
  const makeShader = () => {
    const canvas = glimmRef.current
    if (!canvas) return null
    const random = Math.random
    Math.random = () => 0
    try {
      return createShader({ canvas, palette: sweep, direction: "ltr", bandTight: 10, swellAmount: 0.85 })
    } finally {
      Math.random = random
    }
  }

  useEffect(() => {
    shaderRef.current = makeShader()
    return () => {
      shaderRef.current?.destroy()
      shaderRef.current = null
    }
    // o shader é criado uma vez por montagem; a paleta não muda depois
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const celebrate = () => {
    if (sweepingRef.current) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    shaderRef.current?.destroy()
    const shader = makeShader()
    shaderRef.current = shader
    if (!shader) return
    sweepingRef.current = true
    const dark = document.documentElement.classList.contains("dark")
    const run = playSweep(shader, {
      palette: sweep,
      direction: "ltr",
      sweepMs: 570,
      outroMs: 80,
      peakAlpha: 1.3,
      bandTight: 10,
      brightness: dark ? 1 : 1.4,
      swellAmount: 1,
      waveSpeed: 1.8,
      easing: "easeOutExpo",
    })
    run.done.finally(() => {
      sweepingRef.current = false
    })
  }

  const selectModel = (next: Model) => {
    setModel(next)
    setModelOpen(false)
    if (next.flagship && next.key !== model.key) celebrate()
  }

  /* ditado de demonstração: a transcrição chega depois de um instante */
  useEffect(() => {
    if (!listening) return
    const t = setTimeout(() => {
      setDraft((c) => (c ? `${c.trimEnd()} Crie três headlines para a aula 1` : "Crie três headlines para a aula 1"))
      setListening(false)
      inputRef.current?.focus()
    }, 2200)
    return () => clearTimeout(t)
  }, [listening])

  /* o texto que quebra sobe para cima dos controles; cresce até um limite */
  useLayoutEffect(() => {
    const input = inputRef.current
    const controls = controlsRef.current
    const measure = measureRef.current
    const modelButton = modelRef.current
    if (!input || !controls || !measure || !modelButton) return

    /* 36px no desktop, 44px no celular (alvo de toque) */
    const btn = (controls.firstElementChild as HTMLElement | null)?.offsetWidth || 36
    if (!hero) {
      const fixed = btn * 3 + modelButton.offsetWidth + 4 * 4
      const inlineWidth = controls.clientWidth - fixed
      const needsFull = draft.includes("\n") || measure.offsetWidth + 12 > inlineWidth
      if (needsFull !== expanded) setExpanded(needsFull)
    }

    const minHeight = hero ? 52 : btn
    const maxHeight = 200
    input.style.height = "0px"
    const contentHeight = input.scrollHeight
    input.style.height = `${Math.min(Math.max(contentHeight, minHeight), maxHeight)}px`
    input.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden"
  }, [draft, expanded, hero])

  useEffect(() => {
    if (!modelOpen && !plusOpen) return
    const close = (event: PointerEvent) => {
      if (!(event.target as Element).closest("[data-promptbar]")) {
        setModelOpen(false)
        setPlusOpen(false)
      }
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [modelOpen, plusOpen])

  const closeMenus = () => {
    setPlusOpen(false)
    setModelOpen(false)
  }

  const pick = (row: Row) => {
    const source = SOURCES.find((s) => s.key === row.key)
    if (source?.attach) {
      setAttachments((c) => [...c, SAMPLE_FILES[c.length % SAMPLE_FILES.length]])
      if (token) setDraft(draft.slice(0, token.start))
    } else if (menu === "at") {
      setDraft(`${token ? draft.slice(0, token.start) : draft}@${row.name} `)
    } else {
      setDraft(`${token ? draft.slice(0, token.start) : draft}${row.name} `)
    }
    setPlusOpen(false)
    setDismissed(false)
    inputRef.current?.focus()
  }

  const canSend = (draft.trim().length > 0 || attachments.length > 0 || hasPayload) && !sendDisabled
  const send = () => {
    if (!canSend || streaming) return
    onSend?.(draft.trim(), model)
    setDraft("")
    setAttachments([])
    closeMenus()
  }

  const iconButton =
    "flex size-9 shrink-0 items-center justify-center rounded-full max-sm:size-11 text-ink-2 transition-[background-color,color,transform] duration-150 hover:bg-hover hover:text-ink active:scale-[0.94]"

  return (
    <div data-promptbar className="w-full">
      <div ref={anchorRef} className="relative">
        {/* ── menu @ e / ─────────────────────────────── */}
        {menu && (
          <div
            onMouseLeave={() => setEngaged(false)}
            className="absolute inset-x-0 bottom-full z-20 mb-2 rounded-panel border border-line bg-surface p-1.5"
            style={{ animation: "pop-in 180ms var(--ease-out) both", transformOrigin: "bottom center" }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-1.5 rounded-control bg-hover"
              style={{
                top: rowBox?.top ?? 0,
                height: rowBox?.height ?? 0,
                opacity: rowBox && engaged && rows.length > 0 ? 1 : 0,
                transition:
                  "top 220ms var(--ease-out), height 220ms var(--ease-out), opacity 150ms ease",
              }}
            />
            <div role="listbox" aria-label={menu === "at" ? "Fontes e anexos" : "Comandos"}>
              {rows.map((row, i) => {
                const source = menu === "at" ? SOURCES.find((s) => s.key === row.key) : undefined
                return (
                  <button
                    key={row.key}
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    ref={(el) => {
                      rowRefs.current[i] = el
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => {
                      setActive(i)
                      setEngaged(true)
                    }}
                    onClick={() => pick(row)}
                    className="relative z-10 flex h-10 w-full items-center gap-3 rounded-control px-2.5 text-left"
                  >
                    {source && (
                      <span className="flex size-5 shrink-0 items-center justify-center text-ink-2">{source.icon}</span>
                    )}
                    <span className="shrink-0 text-ui font-medium text-ink">{row.name}</span>
                    <span className="min-w-0 flex-1 truncate text-meta text-ink-3">{row.desc}</span>
                    {source?.connect && (
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation()
                          setConnected((c) => !c)
                        }}
                        className={cn(
                          "shrink-0 text-meta font-medium",
                          connected ? "text-ink-3" : "text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
                        )}
                      >
                        {connected ? "Conectado" : "Conectar"}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {rows.length === 0 && (
              <div className="flex h-10 items-center px-2.5 text-meta text-ink-3">Nada encontrado para “{query}”</div>
            )}
            <div className="mt-1 border-t border-line px-2.5 pt-2 pb-1 text-micro text-ink-3">
              {menu === "at" ? "Digite para buscar fontes e arquivos" : "Digite para buscar comandos"}
            </div>
          </div>
        )}

        {/* ── menu de modelo ──────────────────────────── */}
        {modelOpen && (
          <div
            onMouseLeave={() => setModelHovered(null)}
            role="listbox"
            aria-label="Modelos"
            className="absolute z-20 w-56 rounded-panel border border-line bg-surface p-1.5"
            style={{
              left: modelMenuLeft,
              bottom: modelMenuBottom,
              animation: "pop-in 180ms var(--ease-out) both",
              transformOrigin: "bottom left",
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-1.5 rounded-control bg-hover"
              style={{
                top: modelBox?.top ?? 0,
                height: modelBox?.height ?? 0,
                opacity: modelBox && hovered !== null ? 1 : 0,
                transition:
                  "top 220ms var(--ease-out), height 220ms var(--ease-out), opacity 150ms ease",
              }}
            />
            {MODELS.map((m, i) => (
              <button
                key={m.key}
                type="button"
                role="option"
                aria-selected={m.key === model.key}
                ref={(el) => {
                  modelRowRefs.current[i] = el
                }}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setModelHovered(i)}
                onClick={() => {
                  selectModel(m)
                  inputRef.current?.focus()
                }}
                className="relative z-10 flex min-h-12 w-full items-center gap-2 rounded-control px-2.5 py-1.5 text-left"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-ui font-medium text-ink">{m.name}</span>
                  <span className="text-micro text-ink-3">{m.tag}</span>
                </span>
                <CheckIcon
                  weight="bold"
                  className={cn("size-4 shrink-0 text-ink", m.key !== model.key && "invisible")}
                />
              </button>
            ))}
          </div>
        )}

        {/* ── compositor ──────────────────────────────── */}
        <div
          className={cn(
            "relative isolate flex flex-col overflow-hidden border border-line bg-surface transition-[border-color,border-radius] duration-150 focus-within:border-line-strong",
            hero ? "gap-2 rounded-composer p-3" : "gap-1.5 p-2.5",
            !hero && (attachments.length > 0 || attachmentsSlot || wide ? "rounded-[calc(var(--r-composer)-4px)]" : "rounded-composer")
          )}
        >
          {/* varredura arco-íris: invisível em repouso, acende ao escolher o Pro */}
          <canvas
            ref={glimmRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
            style={{ borderRadius: "inherit" }}
          />
          <span
            ref={measureRef}
            aria-hidden="true"
            className="pointer-events-none invisible absolute whitespace-pre text-body"
          >
            {draft}
          </span>

          {attachmentsSlot}

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1 pt-0.5">
              {attachments.map((file, i) => (
                <span
                  key={`${file}-${i}`}
                  className="flex h-8 items-center gap-2 rounded-control border border-line bg-canvas py-1 pr-1 pl-2 text-meta text-ink-2 dark:bg-bubble"
                  style={{ animation: "pop-in 200ms var(--ease-out) both" }}
                >
                  <FileTextIcon className="size-4" />
                  <span className="max-w-40 truncate">{file}</span>
                  <button
                    type="button"
                    aria-label={`Remover ${file}`}
                    onClick={() => setAttachments((c) => c.filter((_, j) => j !== i))}
                    className="flex size-6 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-hover hover:text-ink"
                  >
                    <XIcon className="size-3" weight="bold" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div
            ref={controlsRef}
            className={cn(
              "grid items-end gap-x-1 gap-y-1.5 [--pb:36px] max-sm:[--pb:44px]",
              wide
                ? "grid-cols-[var(--pb)_auto_minmax(0,1fr)_var(--pb)_var(--pb)]"
                : "grid-cols-[var(--pb)_minmax(0,1fr)_auto_var(--pb)_var(--pb)]"
            )}
          >
            <Tip
              label={plusLabel}
              shortcut={menus ? <kbd data-slot="kbd" className="rounded px-1 text-[11px]">@</kbd> : undefined}
            >
              <button
                type="button"
                aria-label={plusLabel}
                aria-expanded={onPlus ? plusActive : plusOpen}
                onClick={() => {
                  setModelOpen(false)
                  if (onPlus) {
                    onPlus()
                    return
                  }
                  setPlusOpen((c) => !c)
                  inputRef.current?.focus()
                }}
                className={cn(
                  iconButton,
                  (plusOpen || plusActive) && "bg-hover text-ink",
                  wide ? "col-start-1 row-start-2" : "col-start-1 row-start-1"
                )}
              >
                <PlusIcon className="size-5" />
              </button>
            </Tip>

            <textarea
              id="prompt-input"
              ref={inputRef}
              rows={1}
              value={draft}
              autoFocus={autoFocus}
              onChange={(e) => {
                setDraft(e.target.value)
                setDismissed(false)
                setPlusOpen(false)
              }}
              onKeyDown={(e) => {
                if (menu && rows.length > 0) {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault()
                    setEngaged(true)
                    setActive((c) => (c + (e.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length)
                    return
                  }
                  if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") {
                    e.preventDefault()
                    pick(rows[active])
                    return
                  }
                }
                if (e.key === "Escape") {
                  setDismissed(true)
                  closeMenus()
                  return
                }
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder={listening ? "Ouvindo…" : placeholder}
              aria-label="Mensagem"
              enterKeyHint="send"
              className={cn(
                "w-full min-w-0 resize-none bg-transparent text-body text-ink outline-none [overflow-wrap:anywhere] placeholder:text-ink-3 focus-visible:outline-none",
                hero ? "min-h-[52px] px-2 py-1.5 leading-6" : "min-h-9 px-1.5 py-1.5 leading-6",
                wide ? "col-span-full col-start-1 row-start-1" : "col-start-2 row-start-1"
              )}
            />

            <button
              ref={modelRef}
              type="button"
              aria-expanded={modelOpen}
              aria-haspopup="listbox"
              aria-label={`Modelo: ${model.name}`}
              onClick={() => {
                setPlusOpen(false)
                setModelOpen((c) => !c)
              }}
              className={cn(
                "flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-ui font-medium text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink max-sm:h-11",
                modelOpen && "bg-hover text-ink",
                !showModel && "hidden",
                wide ? "col-start-2 row-start-2 justify-self-start" : "col-start-3 row-start-1"
              )}
            >
              {model.name}
              <CaretDownIcon className="size-3.5 text-ink-3" weight="bold" />
            </button>

            <Tip label={onMic ? micLabel : listening ? "Parar ditado" : "Ditar"}>
              <button
                type="button"
                aria-label={onMic ? micLabel : listening ? "Parar ditado" : "Ditar"}
                aria-pressed={onMic ? undefined : listening}
                onClick={() => (onMic ? onMic() : setListening((c) => !c))}
                className={cn(
                  iconButton,
                  listening && "bg-hover text-ink",
                  wide ? "col-start-4 row-start-2" : "col-start-4 row-start-1"
                )}
              >
                {listening ? (
                  <span className="flex h-4 items-center gap-[3px]">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-full w-[3px] origin-center rounded-full bg-current"
                        style={{ animation: `eq-bounce 900ms ease-in-out ${i * 150}ms infinite` }}
                      />
                    ))}
                  </span>
                ) : (
                  <MicrophoneIcon className="size-5" />
                )}
              </button>
            </Tip>

            {streaming ? (
              <Tip label="Parar resposta">
                <button
                  type="button"
                  aria-label="Parar resposta"
                  onClick={onStop}
                  className={cn(
                    "fill-primary flex size-9 shrink-0 items-center justify-center rounded-full transition-transform duration-150 active:scale-[0.94] max-sm:size-11",
                    wide ? "col-start-5 row-start-2" : "col-start-5 row-start-1"
                  )}
                >
                  <StopIcon weight="fill" className="size-3.5" />
                </button>
              </Tip>
            ) : (
              <button
                type="button"
                aria-label="Enviar mensagem"
                disabled={!canSend}
                onClick={send}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-200 enabled:active:scale-[0.94] max-sm:size-11",
                  canSend ? "fill-primary" : "bg-edge text-ink-4 dark:bg-ink-4/40 dark:text-ink-3",
                  wide ? "col-start-5 row-start-2" : "col-start-5 row-start-1"
                )}
              >
                <ArrowUpIcon weight="bold" className="size-[18px]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
