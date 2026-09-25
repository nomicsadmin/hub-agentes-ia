"use client"

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { readChatStream, type ChatEvent, type ChatRequest } from "@/lib/chat/contract"
import { readError, uploadFile } from "@/components/chat/upload"
import type { UiAttachment, UiMessage } from "./types"
import { withBase } from "@/lib/base-path"

/* ─────────────────────────────────────────────────────────
 * TURNOS AO VIVO
 * Cada envio vira um "turno" (mensagem do usuário + resposta do
 * agente chegando em streaming). O turno vive neste store, fora
 * das páginas: a conversa nova navega para /chat/[id] quando o
 * servidor devolve o id, e a resposta continua chegando.
 * ───────────────────────────────────────────────────────── */

export type TurnPhase = "uploading" | "waiting" | "streaming" | "done" | "stopped" | "error"

export type Turn = {
  id: string
  conversationId: string | null
  agentSlug: string
  regenerate: boolean
  /** null quando é "refazer resposta" */
  user: UiMessage | null
  assistant: UiMessage
  phase: TurnPhase
  /** etapas anunciadas pelo servidor ("Lendo o material", "Gerando PDF") */
  steps: string[]
  /** a última etapa chegou depois de texto (ex.: gerando PDF no fim) */
  statusAfterText: boolean
  error: string | null
  startedAt: number
  firstDeltaAt: number | null
  title: string | null
  request: { message: string; attachmentIds: string[] }
  /** mensagem do usuário já foi gravada (o servidor mandou o id) */
  userSaved: boolean
}

type State = { turns: Record<string, Turn>; byConversation: Record<string, string[]> }

type Listener = () => void

const tempId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`

export const isTempId = (value: string) => value.startsWith("tmp-")

class ChatStore {
  private state: State = { turns: {}, byConversation: {} }
  private listeners = new Set<Listener>()
  private controllers = new Map<string, AbortController>()
  private audioFiles = new Map<string, { file: File; userId: string; seconds: number }>()
  /** avisado quando um turno termina (o provider atualiza os dados do servidor) */
  private onTurnFinished?: (turn: Turn) => void

  listenTurnFinished(fn: ((turn: Turn) => void) | undefined) {
    this.onTurnFinished = fn
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }
  getState = () => this.state

  private emit() {
    for (const l of this.listeners) l()
  }

  private patch(turnId: string, fn: (t: Turn) => Partial<Turn>) {
    const current = this.state.turns[turnId]
    if (!current) return
    const next = { ...current, ...fn(current) }
    let byConversation = this.state.byConversation
    if (next.conversationId && next.conversationId !== current.conversationId) {
      const list = byConversation[next.conversationId] ?? []
      byConversation = { ...byConversation, [next.conversationId]: [...list, turnId] }
    }
    this.state = { turns: { ...this.state.turns, [turnId]: next }, byConversation }
    this.emit()
  }

  private add(turn: Turn) {
    const byConversation = { ...this.state.byConversation }
    if (turn.conversationId) byConversation[turn.conversationId] = [...(byConversation[turn.conversationId] ?? []), turn.id]
    this.state = { turns: { ...this.state.turns, [turn.id]: turn }, byConversation }
    this.emit()
  }

  isBusy(conversationId: string | null) {
    if (!conversationId) return false
    return (this.state.byConversation[conversationId] ?? []).some((id) => {
      const phase = this.state.turns[id]?.phase
      return phase === "uploading" || phase === "waiting" || phase === "streaming"
    })
  }

  /* Mensagem de texto (com anexos já enviados) */
  send(opts: {
    conversationId: string | null
    agentSlug: string
    text: string
    attachmentIds: string[]
    attachments: UiAttachment[]
  }) {
    const turn = this.newTurn(opts.conversationId, opts.agentSlug, false, {
      id: tempId("tmp-user"),
      role: "user",
      content: opts.text,
      status: "complete",
      feedback: null,
      createdAt: new Date().toISOString(),
      attachments: opts.attachments,
    })
    turn.request = { message: opts.text, attachmentIds: opts.attachmentIds }
    this.add(turn)
    void this.run(turn.id)
    return turn.id
  }

  /* Áudio: aparece na hora como player; sobe, transcreve e só então pergunta ao agente. */
  sendAudio(opts: {
    conversationId: string | null
    agentSlug: string
    userId: string
    file: File
    localUrl: string
    seconds: number
  }) {
    const turn = this.newTurn(opts.conversationId, opts.agentSlug, false, {
      id: tempId("tmp-user"),
      role: "user",
      content: "",
      status: "complete",
      feedback: null,
      createdAt: new Date().toISOString(),
      attachments: [{ id: tempId("tmp-att"), kind: "audio", title: opts.file.name, mime: opts.file.type, url: opts.localUrl }],
    })
    turn.phase = "uploading"
    this.audioFiles.set(turn.id, { file: opts.file, userId: opts.userId, seconds: opts.seconds })
    this.add(turn)
    void this.uploadAudioThenRun(turn.id)
    return turn.id
  }

  /* Refazer a última resposta do agente */
  regenerate(conversationId: string, agentSlug: string, lastUserText: string) {
    const turn = this.newTurn(conversationId, agentSlug, true, null)
    turn.request = { message: lastUserText, attachmentIds: [] }
    this.add(turn)
    void this.run(turn.id)
    return turn.id
  }

  /* "Tentar de novo" depois de um erro */
  retry(turnId: string) {
    const t = this.state.turns[turnId]
    if (!t) return
    if (this.audioFiles.has(turnId) && !t.request.attachmentIds.length) {
      this.patch(turnId, () => ({ phase: "uploading", error: null }))
      void this.uploadAudioThenRun(turnId)
      return
    }
    this.patch(turnId, (cur) => ({
      phase: "waiting",
      error: null,
      steps: [],
      statusAfterText: false,
      startedAt: Date.now(),
      firstDeltaAt: null,
      // se a pergunta já foi gravada, pede só uma nova resposta
      regenerate: cur.regenerate || cur.userSaved,
      assistant: { ...cur.assistant, content: "", attachments: [], status: "streaming" },
    }))
    void this.run(turnId)
  }

  stop(turnId: string) {
    this.controllers.get(turnId)?.abort()
  }

  private newTurn(conversationId: string | null, agentSlug: string, regenerate: boolean, user: UiMessage | null): Turn {
    return {
      id: tempId("turn"),
      conversationId,
      agentSlug,
      regenerate,
      user,
      assistant: {
        id: tempId("tmp-assistant"),
        role: "assistant",
        content: "",
        status: "streaming",
        feedback: null,
        createdAt: new Date().toISOString(),
        attachments: [],
      },
      phase: "waiting",
      steps: [],
      statusAfterText: false,
      error: null,
      startedAt: Date.now(),
      firstDeltaAt: null,
      title: null,
      request: { message: user?.content ?? "", attachmentIds: [] },
      userSaved: false,
    }
  }

  private async uploadAudioThenRun(turnId: string) {
    const audio = this.audioFiles.get(turnId)
    if (!audio) return
    try {
      const result = await uploadFile(audio.file, "audio", { userId: audio.userId, durationSeconds: audio.seconds })
      const transcript = result.transcript?.trim() ?? ""
      if (!transcript) {
        this.patch(turnId, () => ({ phase: "error", error: "Não deu para entender o áudio. Grave de novo, perto do microfone." }))
        return
      }
      this.patch(turnId, (t) => ({
        phase: "waiting",
        startedAt: Date.now(),
        request: { message: transcript, attachmentIds: [result.id] },
        user: t.user
          ? {
              ...t.user,
              content: transcript,
              attachments: t.user.attachments.map((a) => (a.kind === "audio" ? { ...a, id: result.id, transcript } : a)),
            }
          : null,
      }))
      await this.run(turnId)
    } catch (e) {
      this.patch(turnId, () => ({ phase: "error", error: e instanceof Error ? e.message : "Não foi possível enviar o áudio." }))
    }
  }

  private async run(turnId: string) {
    const turn = this.state.turns[turnId]
    if (!turn) return
    const controller = new AbortController()
    this.controllers.set(turnId, controller)

    const body: ChatRequest = {
      agentSlug: turn.agentSlug,
      message: turn.request.message,
      ...(turn.conversationId ? { conversationId: turn.conversationId } : {}),
      ...(turn.request.attachmentIds.length && !turn.regenerate ? { attachmentIds: turn.request.attachmentIds } : {}),
      ...(turn.regenerate ? { regenerate: true } : {}),
    }

    let finished = false
    try {
      const res = await fetch(withBase("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!res.ok) {
        const message =
          res.status === 429
            ? await readError(res, "Você chegou ao limite de mensagens de hoje. Volte amanhã.")
            : await readError(res, "O agente não respondeu. Tente de novo.")
        this.patch(turnId, () => ({ phase: "error", error: message }))
        return
      }
      await readChatStream(res, (event) => {
        if (event.type === "done" || event.type === "error") finished = true
        this.onEvent(turnId, event)
      })
      if (!finished) {
        this.patch(turnId, () => ({ phase: "error", error: "A conexão caiu antes do fim da resposta." }))
      }
    } catch (e) {
      if (controller.signal.aborted) {
        this.patch(turnId, (t) => ({ phase: "stopped", assistant: { ...t.assistant, status: "stopped" } }))
      } else {
        console.error("[chat]", e)
        this.patch(turnId, () => ({ phase: "error", error: "Sem conexão com o servidor. Confira a internet e tente de novo." }))
      }
    } finally {
      this.controllers.delete(turnId)
      const t = this.state.turns[turnId]
      if (t && (t.phase === "done" || t.phase === "stopped" || t.phase === "error")) this.onTurnFinished?.(t)
    }
  }

  private onEvent(turnId: string, event: ChatEvent) {
    switch (event.type) {
      case "meta": {
        this.patch(turnId, (t) => ({
          conversationId: event.conversationId,
          userSaved: t.userSaved || !!event.userMessageId,
          user: t.user && event.userMessageId ? { ...t.user, id: event.userMessageId } : t.user,
          assistant: { ...t.assistant, id: event.assistantMessageId },
        }))
        break
      }
      case "status":
        this.patch(turnId, (t) => ({
          steps: t.steps[t.steps.length - 1] === event.label ? t.steps : [...t.steps, event.label],
          statusAfterText: t.assistant.content.length > 0,
        }))
        break
      case "delta":
        this.patch(turnId, (t) => ({
          phase: "streaming",
          statusAfterText: false,
          firstDeltaAt: t.firstDeltaAt ?? Date.now(),
          assistant: { ...t.assistant, content: t.assistant.content + event.text },
        }))
        break
      case "attachment":
        this.patch(turnId, (t) => ({
          statusAfterText: false,
          assistant: {
            ...t.assistant,
            attachments: [
              ...t.assistant.attachments,
              { id: event.attachment.id, kind: "generated_pdf", title: event.attachment.title, url: event.attachment.url },
            ],
          },
        }))
        break
      case "done":
        this.patch(turnId, (t) => ({
          phase: "done",
          title: event.title ?? null,
          statusAfterText: false,
          assistant: { ...t.assistant, status: "complete" },
        }))
        break
      case "error":
        this.patch(turnId, () => ({ phase: "error", error: event.message || "O agente não conseguiu responder. Tente de novo." }))
        break
    }
  }
}

const ChatStoreContext = createContext<ChatStore | null>(null)

export function ChatStoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => new ChatStore())
  const router = useRouter()
  useEffect(() => {
    // resposta terminou: busca de novo o que o servidor gravou (título, lista da barra lateral)
    store.listenTurnFinished(() => router.refresh())
    return () => store.listenTurnFinished(undefined)
  }, [store, router])
  return <ChatStoreContext.Provider value={store}>{children}</ChatStoreContext.Provider>
}

export function useChatStore() {
  const store = useContext(ChatStoreContext)
  if (!store) throw new Error("useChatStore fora do ChatStoreProvider")
  return store
}

export function useChatState() {
  const store = useChatStore()
  return useSyncExternalStore(store.subscribe, store.getState, store.getState)
}
