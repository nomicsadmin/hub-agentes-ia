"use client"

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  ArrowDownIcon,
  CaretDownIcon,
  CheckIcon,
  DotsThreeIcon,
  NotePencilIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tip } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AppHeader } from "@/components/shell/app-header"
import { ChatComposer, type ComposerSend } from "@/components/chat/composer"
import { LoadingState } from "@/components/chat/loading-state"
import { Reasoning } from "@/components/chat/agent-work"
import { AssistantActions, AssistantMessage, MessageError, UserMessage, type Vote } from "@/components/chat/messages"
import { AudioMessage, ImageThumb, PdfCard } from "@/components/chat/attachments"
import { Markdown, markdownToPlain, useSmoothText } from "@/components/chat/markdown"
import { restoreConversation, setArchived, setFeedback } from "@/app/(app)/actions"
import { AgentIcon } from "./agent-icon"
import { useAppData } from "./app-data"
import { isTempId, useChatState, useChatStore, type Turn } from "./chat-store"
import { ConversationMenuItems, useConversationActions, type ConvRef } from "./conversation-actions"
import { useMediaQuery } from "./hooks"
import type { AgentInfo, UiAttachment, UiMessage } from "./types"
import { withBase } from "@/lib/base-path"

/* ─────────────────────────────────────────────────────────
 * CONVERSA
 * Mensagens do servidor + turnos ao vivo do store. A resposta
 * chega em streaming; parar, copiar, refazer, 👍/👎, baixar em
 * PDF e "Tentar de novo" ficam no fim de cada resposta.
 * ───────────────────────────────────────────────────────── */

type Item = { key: string; message: UiMessage; turn?: Turn }

function buildItems(server: UiMessage[], turns: Turn[]): Item[] {
  const live = new Map<string, Item>()
  for (const t of turns) {
    if (t.user && !isTempId(t.user.id)) live.set(t.user.id, { key: t.user.id, message: t.user, turn: t })
    if (!isTempId(t.assistant.id)) live.set(t.assistant.id, { key: t.assistant.id, message: t.assistant, turn: t })
  }
  const used = new Set<string>()
  const items: Item[] = server.map((m) => {
    const l = live.get(m.id)
    if (l) {
      used.add(m.id)
      return l
    }
    return { key: m.id, message: m }
  })
  for (const t of turns) {
    if (t.user && !used.has(t.user.id)) items.push({ key: `${t.id}-u`, message: t.user, turn: t })
    if (!used.has(t.assistant.id)) items.push({ key: `${t.id}-a`, message: t.assistant, turn: t })
  }
  // "refazer" gera respostas seguidas: mostra só a última de cada sequência
  return items.filter((it, i) => !(it.message.role === "assistant" && items[i + 1]?.message.role === "assistant"))
}

const busyPhase = (t: Turn) => t.phase === "uploading" || t.phase === "waiting" || t.phase === "streaming"

export function ChatView({
  conversationId,
  conversation,
  agent,
  agents,
  initialMessages,
}: {
  conversationId: string | null
  conversation: ConvRef | null
  agent: AgentInfo
  agents: AgentInfo[]
  initialMessages: UiMessage[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const store = useChatStore()
  const state = useChatState()
  const { profile } = useAppData()
  const [localTurnIds, setLocalTurnIds] = useState<string[]>([])
  const [votes, setVotes] = useState<Record<string, Vote>>({})

  const turnIds = conversationId ? (state.byConversation[conversationId] ?? []) : localTurnIds
  const turns = turnIds.map((id) => state.turns[id]).filter((t): t is Turn => !!t)
  const items = buildItems(initialMessages, turns)
  const activeTurn = turns.find(busyPhase)
  const busy = !!activeTurn
  const empty = items.length === 0

  /* conversa nova ganhou id: vai para /chat/[id] sem perder o streaming */
  const createdId = conversationId ? null : (turns.find((t) => t.conversationId)?.conversationId ?? null)
  useEffect(() => {
    if (createdId && pathname === "/chat") router.replace(`/chat/${createdId}`, { scroll: false })
  }, [createdId, pathname, router])

  const liveTitle = [...turns].reverse().find((t) => t.title)?.title
  const title = liveTitle ?? conversation?.title ?? null
  const trashed = !!conversation?.deleted_at

  /* ── rolagem que acompanha o fim ─────────────────────── */
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(true)
  const [atBottom, setAtBottom] = useState(true)

  const scrollToEnd = (smooth: boolean) => {
    const el = scrollRef.current
    if (!el) return
    stickRef.current = true
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" })
  }

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  /* no computador o campo já abre focado; no celular não (abriria o teclado) */
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return
    document.getElementById("prompt-input")?.focus({ preventScroll: true })
  }, [conversationId])

  useEffect(() => {
    const el = scrollRef.current
    const content = contentRef.current
    if (!el || !content) return
    const ro = new ResizeObserver(() => {
      if (stickRef.current) el.scrollTop = el.scrollHeight
    })
    ro.observe(content)
    return () => ro.disconnect()
  }, [empty])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    stickRef.current = near
    if (near !== atBottom) setAtBottom(near)
  }

  /* ── enviar ──────────────────────────────────────────── */
  const track = (turnId: string) => {
    if (!conversationId) setLocalTurnIds((cur) => [...cur, turnId])
    requestAnimationFrame(() => scrollToEnd(false))
  }

  const send = (payload: ComposerSend) => {
    if (busy || trashed) return
    const attachments: UiAttachment[] = payload.attachments.map((a) => ({
      id: a.id,
      kind: a.kind,
      title: a.title,
      mime: a.mime,
      url: a.kind === "image" ? a.url : withBase(`/api/pdf/${a.id}`),
    }))
    track(
      store.send({
        conversationId,
        agentSlug: agent.slug,
        text: payload.text,
        attachmentIds: payload.attachmentIds,
        attachments,
      })
    )
  }

  const sendAudio = (file: File, localUrl: string, seconds: number) => {
    if (busy || trashed) return
    track(store.sendAudio({ conversationId, agentSlug: agent.slug, userId: profile.id, file, localUrl, seconds }))
  }

  const lastUserText = [...items].reverse().find((i) => i.message.role === "user")?.message.content ?? ""
  const regenerate = () => {
    if (!conversationId || busy) return
    track(store.regenerate(conversationId, agent.slug, lastUserText))
  }

  const vote = (messageId: string, next: Vote, previous: Vote) => {
    setVotes((v) => ({ ...v, [messageId]: next }))
    void setFeedback(messageId, next === "up" ? 1 : next === "down" ? -1 : null).then((res) => {
      if (!res.ok) {
        setVotes((v) => ({ ...v, [messageId]: previous }))
        toast.error(res.error)
      }
    })
  }

  const lastAssistantIndex = items.map((i) => i.message.role).lastIndexOf("assistant")

  const composer = (
    <ChatComposer
      userId={profile.id}
      hero={empty}
      placeholder={`Pergunte ao ${agent.name}`}
      streaming={busy}
      disabled={trashed}
      onSend={send}
      onSendAudio={sendAudio}
      onStop={() => activeTurn && store.stop(activeTurn.id)}
    />
  )

  return (
    <>
      <AppHeader
        title={
          conversationId || turns.length > 0 ? (
            <div className="flex min-w-0 flex-col px-1.5 leading-tight">
              <h1 className="truncate text-ui font-semibold text-ink">{title ?? "Nova conversa"}</h1>
              <span className="flex items-center gap-1 truncate text-micro text-ink-3">
                <AgentIcon name={agent.icon} className="size-3" />
                {agent.name}
              </span>
            </div>
          ) : (
            <AgentPicker agent={agent} agents={agents} />
          )
        }
        actions={
          <>
            {conversation && !trashed && <HeaderMenu conv={{ ...conversation, title: title ?? conversation.title }} />}
            <Tip label="Novo chat">
              <Link
                href={`/chat?agente=${agent.slug}`}
                aria-label="Novo chat"
                className="flex size-9 items-center justify-center rounded-control text-ink-2 transition-colors hover:bg-hover hover:text-ink max-md:size-11"
              >
                <NotePencilIcon className="size-5" />
              </Link>
            </Tip>
          </>
        }
      />

      {empty ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
          <div className="mx-auto flex min-h-full w-full max-w-(--thread-w) flex-col">
            <div className="order-0 min-h-6 flex-1" />
            <div className="order-1 flex flex-col items-center gap-3 text-center">
              <span className="flex size-12 items-center justify-center rounded-full border border-line text-ink">
                <AgentIcon name={agent.icon} className="size-6" />
              </span>
              <h2 className="type-display text-display font-semibold text-ink">Por onde começamos?</h2>
              {agent.description && <p className="max-w-md text-ui text-ink-2">{agent.description}</p>}
            </div>
            <div className="order-2 pt-6">{composer}</div>
            {agent.starters.length > 0 && (
              <div className="order-3 mt-4 flex flex-wrap justify-center gap-2">
                {agent.starters.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send({ text: s, attachmentIds: [], attachments: [] })}
                    className="flex h-10 items-center rounded-full border border-line px-4 text-ui text-ink-2 transition-colors hover:border-line-strong hover:bg-hover hover:text-ink max-sm:h-11"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="order-4 min-h-6 flex-[1.6] pb-[env(safe-area-inset-bottom)] sm:flex-[1.4]" />
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            <div ref={scrollRef} onScroll={onScroll} className="absolute inset-0 overflow-y-auto overscroll-contain">
              <div ref={contentRef} className="mx-auto flex w-full max-w-(--thread-w) flex-col gap-6 px-4 pt-3 pb-10 md:px-6 md:pt-6">
                {conversation && <StateBanner conv={conversation} />}
                {items.map((it, i) =>
                  it.message.role === "user" ? (
                    <div key={it.key} className={cn(i > 0 && "mt-4")}>
                      <UserItem message={it.message} pendingAudio={it.turn?.phase === "uploading"} />
                    </div>
                  ) : (
                    <AssistantItem
                      key={it.key}
                      message={it.message}
                      turn={it.turn}
                      isLast={i === lastAssistantIndex}
                      canRegenerate={!!conversationId && !busy && !trashed}
                      vote={
                        votes[it.message.id] !== undefined
                          ? votes[it.message.id]
                          : it.message.feedback === 1
                            ? "up"
                            : it.message.feedback === -1
                              ? "down"
                              : null
                      }
                      onVote={(next, prev) => vote(it.message.id, next, prev)}
                      onRegenerate={regenerate}
                      onRetry={() => it.turn && store.retry(it.turn.id)}
                    />
                  )
                )}
              </div>
            </div>

            {!atBottom && (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center">
                <button
                  type="button"
                  aria-label="Ir para o fim"
                  onClick={() => scrollToEnd(true)}
                  className="pointer-events-auto flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition-colors hover:text-ink max-md:size-11"
                  style={{ animation: "pop-in 180ms var(--ease-out) both" }}
                >
                  <ArrowDownIcon className="size-[18px]" />
                </button>
              </div>
            )}
          </div>

          {!trashed && (
            <div className="shrink-0 px-3 pb-[calc(env(safe-area-inset-bottom)+16px)] md:px-6 md:pb-3">
              <div className="mx-auto w-full max-w-(--thread-w)">{composer}</div>
              <p className="mt-2 hidden text-center text-micro text-ink-3 md:block">
                O agente pode errar. Confira o que for importante no material.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  )
}

/* ── Cabeçalho ─────────────────────────────────────────── */

function AgentPicker({ agent, agents }: { agent: AgentInfo; agents: AgentInfo[] }) {
  const router = useRouter()
  if (agents.length <= 1) return <h1 className="truncate px-1.5 text-body font-semibold text-ink">{agent.name}</h1>
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex h-10 min-w-0 items-center gap-1.5 rounded-control px-2.5 text-body font-semibold text-ink transition-colors hover:bg-hover data-popup-open:bg-hover max-md:h-11"
          />
        }
      >
        <span className="truncate">{agent.name}</span>
        <CaretDownIcon weight="bold" className="size-3.5 shrink-0 text-ink-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 max-w-[calc(100vw-1rem)] p-1.5">
        {agents.map((a) => (
          <DropdownMenuItem
            key={a.slug}
            onClick={() => router.replace(`/chat?agente=${a.slug}`)}
            className="h-auto min-h-14 items-start gap-3 py-2.5"
          >
            <AgentIcon name={a.icon} className="mt-0.5 size-5" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-ui font-medium text-ink">{a.name}</span>
              {a.description && <span className="line-clamp-2 text-micro text-ink-3">{a.description}</span>}
            </span>
            {a.slug === agent.slug && <CheckIcon weight="bold" className="mt-1 size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function HeaderMenu({ conv }: { conv: ConvRef }) {
  const mobile = useMediaQuery("(max-width: 767px)")
  const actions = useConversationActions()
  const trigger =
    "flex size-9 items-center justify-center rounded-control text-ink-2 transition-colors hover:bg-hover hover:text-ink data-popup-open:bg-hover max-md:size-11"
  if (mobile) {
    return (
      <button type="button" aria-label="Opções da conversa" onClick={() => actions.openSheet(conv)} className={trigger}>
        <DotsThreeIcon weight="bold" className="size-5" />
      </button>
    )
  }
  return (
    <DropdownMenu>
      <Tip label="Opções da conversa">
        <DropdownMenuTrigger render={<button type="button" aria-label="Opções da conversa" className={trigger} />}>
          <DotsThreeIcon weight="bold" className="size-5" />
        </DropdownMenuTrigger>
      </Tip>
      <DropdownMenuContent align="end" className="w-52">
        <ConversationMenuItems conv={conv} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* Conversa na lixeira ou arquivada */
function StateBanner({ conv }: { conv: ConvRef }) {
  const [pending, startTransition] = useTransition()
  if (!conv.deleted_at && !conv.archived_at) return null
  const trashed = !!conv.deleted_at
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-control border border-line px-3.5 py-2.5 text-ui text-ink-2">
      {trashed ? <TrashIcon className="size-[18px] shrink-0" /> : <ArchiveIcon className="size-[18px] shrink-0" />}
      <span className="min-w-0 flex-1">
        {trashed ? "Esta conversa está na lixeira. Restaure para continuar." : "Esta conversa está arquivada."}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        className="max-sm:h-11"
        onClick={() =>
          startTransition(async () => {
            const res = trashed ? await restoreConversation(conv.id) : await setArchived(conv.id, false)
            if (!res.ok) toast.error(res.error)
          })
        }
      >
        <ArrowCounterClockwiseIcon />
        {trashed ? "Restaurar" : "Desarquivar"}
      </Button>
    </div>
  )
}

/* ── Mensagens ─────────────────────────────────────────── */

function UserItem({ message, pendingAudio }: { message: UiMessage; pendingAudio: boolean }) {
  const audio = message.attachments.find((a) => a.kind === "audio")
  const images = message.attachments.filter((a) => a.kind === "image")
  const pdfs = message.attachments.filter((a) => a.kind === "pdf")
  const before =
    images.length || pdfs.length || audio ? (
      <>
        {images.length > 0 && (
          <div className="flex max-w-[85%] flex-wrap justify-end gap-1.5">
            {images.map((a) => (
              <ImageThumb key={a.id} id={a.id} src={a.url} title={a.title} />
            ))}
          </div>
        )}
        {pdfs.map((a) => (
          <PdfCard key={a.id} title={a.title} href={a.url} className="max-w-[85%]" />
        ))}
        {audio && <AudioMessage src={audio.url} transcript={audio.transcript || message.content} pending={pendingAudio} />}
      </>
    ) : undefined
  return (
    <UserMessage text={audio ? "" : message.content} editable={false} before={before}>
      {audio ? null : message.content}
    </UserMessage>
  )
}

function AssistantItem({
  message,
  turn,
  isLast,
  canRegenerate,
  vote,
  onVote,
  onRegenerate,
  onRetry,
}: {
  message: UiMessage
  turn?: Turn
  isLast: boolean
  canRegenerate: boolean
  vote: Vote
  onVote: (next: Vote, previous: Vote) => void
  onRegenerate: () => void
  onRetry: () => void
}) {
  const phase = turn?.phase
  const live = !!turn && (phase === "waiting" || phase === "streaming" || phase === "uploading")
  const shown = useSmoothText(message.content, !!turn)
  const revealing = !!turn && shown.length < message.content.length
  const waiting = !!turn && (phase === "waiting" || phase === "uploading") && !message.content
  const steps = turn?.steps ?? []
  const saved = !isTempId(message.id)

  if (phase === "uploading" && !message.content) return null

  const serverError = !turn && message.status === "error" && !message.content
  const finished = !live && !revealing && phase !== "error" && !serverError

  return (
    <AssistantMessage>
      {waiting &&
        (steps.length > 0 ? (
          <Reasoning
            key="thinking"
            thinking
            steps={steps.map((s, i) => ({ title: s, done: i < steps.length - 1 }))}
          />
        ) : (
          <LoadingState label="Pensando" />
        ))}

      {!waiting && turn && steps.length > 0 && turn.firstDeltaAt && (
        <Reasoning
          key="done"
          thinking={false}
          seconds={(turn.firstDeltaAt - turn.startedAt) / 1000}
          steps={steps.map((s) => ({ title: s, done: true }))}
        />
      )}

      {(turn ? shown : message.content) && <Markdown text={turn ? shown : message.content} streaming={live || revealing} />}

      {turn?.statusAfterText && live && <LoadingState label={steps[steps.length - 1] ?? "Trabalhando"} />}

      {message.attachments
        .filter((a) => a.kind === "generated_pdf")
        .map((a) => (
          <PdfCard key={a.id} title={a.title} href={a.url || withBase(`/api/pdf/${a.id}`)} generated />
        ))}

      {(phase === "stopped" || (!turn && message.status === "stopped")) && (
        <p className="text-meta text-ink-3">Resposta interrompida.</p>
      )}

      {phase === "error" && turn && <MessageError message={turn.error ?? "O agente não respondeu."} onRetry={onRetry} />}
      {serverError && (
        <MessageError
          message="A resposta não foi concluída."
          onRetry={isLast && canRegenerate ? onRegenerate : undefined}
        />
      )}

      {finished && message.content && (
        <AssistantActions
          text={markdownToPlain(message.content)}
          vote={vote}
          onVote={saved ? (next) => onVote(next, vote) : undefined}
          pdfHref={saved ? withBase(`/api/pdf/message/${message.id}`) : undefined}
          showRetry={isLast && canRegenerate}
          onRetry={onRegenerate}
        />
      )}
    </AssistantMessage>
  )
}
