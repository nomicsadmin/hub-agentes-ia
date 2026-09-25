"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUpIcon, CameraIcon, FileArrowUpIcon, ImagesIcon, TrashIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { UPLOAD_LIMITS } from "@/lib/chat/contract"
import { cn } from "@/lib/utils"
import { Tip } from "@/components/ui/tooltip"
import { useMediaQuery } from "@/components/app/hooks"
import { PromptBar } from "./prompt-bar"
import { PendingAttachment, type PendingFile } from "./attachments"
import {
  ACCEPT_FILES,
  ACCEPT_IMAGES,
  audioExtension,
  heicToJpeg,
  isHeic,
  kindOf,
  pickAudioMime,
  uploadFile,
  validateFile,
} from "./upload"

/* ─────────────────────────────────────────────────────────
 * COMPOSITOR DO APP
 * O PromptBar do Design System com anexos e áudio de verdade:
 *   📎  arquivo, galeria ou câmera; até 5 por mensagem; sobem
 *       na hora (POST /api/uploads) e mostram prévia
 *   🎤  toque para gravar, toque para enviar ou cancelar;
 *       limite de 5 minutos
 * ───────────────────────────────────────────────────────── */

export type ComposerSend = {
  text: string
  attachmentIds: string[]
  /** para mostrar na hora, antes de o servidor responder */
  attachments: { id: string; kind: "image" | "pdf"; title: string; url: string | null; mime: string }[]
}

const MAX_SECONDS = UPLOAD_LIMITS.audioSeconds

function newId() {
  return Math.random().toString(36).slice(2)
}

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`
}

export function ChatComposer({
  userId,
  hero,
  placeholder,
  streaming,
  disabled,
  onSend,
  onSendAudio,
  onStop,
  autoFocus,
}: {
  /** pasta do usuário no Storage (chat-uploads/{userId}/...) */
  userId: string
  hero?: boolean
  placeholder?: string
  streaming?: boolean
  /** conversa na lixeira etc. */
  disabled?: boolean
  onSend: (payload: ComposerSend) => void
  onSendAudio: (file: File, localUrl: string, seconds: number) => void
  onStop?: () => void
  autoFocus?: boolean
}) {
  const [files, setFiles] = useState<PendingFile[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const touch = useMediaQuery("(pointer: coarse)")

  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const cancelRef = useRef(false)
  const startedRef = useRef(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  /* fecha o menu do + ao tocar fora */
  useEffect(() => {
    if (!menuOpen) return
    const close = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [menuOpen])

  /* libera as prévias locais ao sair */
  const filesRef = useRef(files)
  useEffect(() => {
    filesRef.current = files
  }, [files])
  useEffect(
    () => () => {
      for (const f of filesRef.current) if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    },
    []
  )

  /* cronômetro da gravação e corte em 5 minutos */
  useEffect(() => {
    if (!recording) return
    const t = setInterval(() => {
      const s = (Date.now() - startedRef.current) / 1000
      setSeconds(s)
      const r = recorderRef.current
      if (s >= MAX_SECONDS && r && r.state === "recording") {
        toast("Limite de 5 minutos atingido. Enviando o áudio.")
        cancelRef.current = false
        r.stop()
      }
    }, 250)
    return () => clearInterval(t)
  }, [recording])

  const addFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return
    const room = UPLOAD_LIMITS.filesPerMessage - files.length
    const chosen = Array.from(list)
    if (chosen.length > room) toast(`Até ${UPLOAD_LIMITS.filesPerMessage} arquivos por mensagem.`)
    const accepted: PendingFile[] = []
    for (const original of chosen.slice(0, Math.max(0, room))) {
      let file = original
      const problem = validateFile(file)
      if (problem) {
        toast.error(problem)
        continue
      }
      // HEIC: o agente não lê; vira JPEG aqui mesmo
      if (isHeic(file)) {
        const jpeg = await heicToJpeg(file)
        if (!jpeg) {
          toast.error(`Não deu para abrir "${file.name}". Envie a imagem em JPG ou PNG.`)
          continue
        }
        file = jpeg
        const again = validateFile(file)
        if (again) {
          toast.error(again)
          continue
        }
      }
      const kind = kindOf(file)!
      accepted.push({
        localId: newId(),
        file,
        kind,
        previewUrl: kind === "image" ? URL.createObjectURL(file) : null,
        status: "uploading",
      })
    }
    if (!accepted.length) return
    setFiles((cur) => [...cur, ...accepted].slice(0, UPLOAD_LIMITS.filesPerMessage))
    for (const item of accepted) {
      uploadFile(item.file, item.kind, { userId })
        .then((res) =>
          setFiles((cur) => cur.map((f) => (f.localId === item.localId ? { ...f, status: "ready", uploadedId: res.id } : f)))
        )
        .catch((e: unknown) =>
          setFiles((cur) =>
            cur.map((f) =>
              f.localId === item.localId
                ? { ...f, status: "error", error: e instanceof Error ? e.message : "Não foi possível enviar." }
                : f
            )
          )
        )
    }
  }

  const removeFile = (localId: string) => {
    setFiles((cur) => {
      const target = cur.find((f) => f.localId === localId)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return cur.filter((f) => f.localId !== localId)
    })
  }

  const uploading = files.some((f) => f.status === "uploading")
  const ready = files.filter((f) => f.status === "ready" && f.uploadedId)

  const send = (text: string) => {
    if (uploading) return
    if (!text && ready.length === 0) return
    onSend({
      text,
      attachmentIds: ready.map((f) => f.uploadedId!),
      attachments: ready.map((f) => ({
        id: f.uploadedId!,
        kind: f.kind,
        title: f.file.name,
        url: f.previewUrl,
        mime: f.file.type,
      })),
    })
    // as prévias seguem em uso na mensagem enviada; só limpa a lista
    setFiles([])
  }

  /* ── gravação ───────────────────────────────────────── */

  const startRecording = async () => {
    if (recording) return
    const mime = pickAudioMime()
    if (mime === null || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Este navegador não grava áudio. Atualize o navegador ou digite sua pergunta.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      streamRef.current = stream
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []
      cancelRef.current = false
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        setRecording(false)
        setSeconds(0)
        if (cancelRef.current) return
        const type = recorder.mimeType || mime || "audio/webm"
        const blob = new Blob(chunksRef.current, { type })
        if (blob.size < 1000) {
          toast("Áudio curto demais. Segure um pouco mais.")
          return
        }
        const file = new File([blob], `audio-${Date.now()}.${audioExtension(type)}`, { type: type.split(";")[0] })
        const duration = Math.min(MAX_SECONDS, (Date.now() - startedRef.current) / 1000)
        onSendAudio(file, URL.createObjectURL(blob), duration)
      }
      startedRef.current = Date.now()
      recorder.start(1000)
      setMenuOpen(false)
      setSeconds(0)
      setRecording(true)
    } catch (e) {
      const name = e instanceof DOMException ? e.name : ""
      toast.error(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Libere o microfone para este site nas configurações do navegador."
          : "Não foi possível usar o microfone."
      )
    }
  }

  const finishRecording = (cancel: boolean) => {
    cancelRef.current = cancel
    const r = recorderRef.current
    if (r && r.state !== "inactive") r.stop()
  }

  const menuItem =
    "flex h-11 w-full items-center gap-3 rounded-control px-2.5 text-left text-ui text-ink transition-colors hover:bg-hover [&_svg]:size-[18px] [&_svg]:text-ink-2"

  return (
    <div ref={wrapRef} className="relative w-full">
      <input
        ref={fileInput}
        type="file"
        multiple
        accept={ACCEPT_FILES}
        className="hidden"
        onChange={(e) => {
          const list = e.target.files
          void addFiles(list).finally(() => {
            e.target.value = ""
          })
        }}
      />
      <input
        ref={cameraInput}
        type="file"
        accept={ACCEPT_IMAGES}
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const list = e.target.files
          void addFiles(list).finally(() => {
            e.target.value = ""
          })
        }}
      />

      {menuOpen && (
        <div
          role="menu"
          aria-label="Anexar"
          className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded-panel border border-line bg-surface p-1.5"
          style={{ animation: "pop-in 180ms var(--ease-out) both", transformOrigin: "bottom left" }}
        >
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            onClick={() => {
              setMenuOpen(false)
              fileInput.current?.click()
            }}
          >
            {touch ? <ImagesIcon /> : <FileArrowUpIcon />}
            {touch ? "Galeria ou arquivos" : "Fotos e arquivos"}
          </button>
          {touch && (
            <button
              type="button"
              role="menuitem"
              className={menuItem}
              onClick={() => {
                setMenuOpen(false)
                cameraInput.current?.click()
              }}
            >
              <CameraIcon />
              Tirar foto
            </button>
          )}
          <p className="mt-1 border-t border-line px-2.5 pt-2 pb-1 text-micro text-ink-3">
            PDF até 20 MB, imagem até 10 MB. Até 5 por mensagem.
          </p>
        </div>
      )}

      {recording ? (
        <div
          className="flex h-14 items-center gap-2 rounded-composer border border-line-strong bg-surface px-2 max-sm:h-16"
          role="group"
          aria-label="Gravando áudio"
          style={{ animation: "fade-in 150ms var(--ease-out) both" }}
        >
          <Tip label="Cancelar gravação">
            <button
              type="button"
              aria-label="Cancelar gravação"
              onClick={() => finishRecording(true)}
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-hover hover:text-danger max-sm:size-11"
            >
              <TrashIcon className="size-5" />
            </button>
          </Tip>
          <span className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="size-2 shrink-0 animate-pulse rounded-full bg-danger" aria-hidden />
            <span className="font-mono text-ui text-ink tabular-nums" aria-live="off">
              {clock(seconds)}
            </span>
            <span className="text-micro text-ink-3 tabular-nums">/ {clock(MAX_SECONDS)}</span>
            <span className="ml-1 flex h-4 items-center gap-[3px] text-ink-2" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="h-full w-[3px] origin-center rounded-full bg-current"
                  style={{ animation: `eq-bounce 900ms ease-in-out ${i * 140}ms infinite` }}
                />
              ))}
            </span>
          </span>
          <Tip label="Enviar áudio">
            <button
              type="button"
              aria-label="Enviar áudio"
              onClick={() => finishRecording(false)}
              className="fill-primary flex size-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-[0.94] max-sm:size-11"
            >
              <ArrowUpIcon weight="bold" className="size-[18px]" />
            </button>
          </Tip>
        </div>
      ) : (
        <div className={cn(disabled && "pointer-events-none opacity-50")}>
          <PromptBar
            hero={hero}
            placeholder={placeholder}
            streaming={streaming}
            autoFocus={autoFocus}
            showModel={false}
            menus={false}
            plusLabel="Anexar foto ou PDF"
            plusActive={menuOpen}
            onPlus={() => {
              if (files.length >= UPLOAD_LIMITS.filesPerMessage) {
                toast(`Até ${UPLOAD_LIMITS.filesPerMessage} arquivos por mensagem.`)
                return
              }
              setMenuOpen((c) => !c)
            }}
            micLabel="Gravar áudio"
            onMic={() => void startRecording()}
            hasPayload={ready.length > 0}
            sendDisabled={uploading || disabled}
            attachmentsSlot={
              files.length > 0 ? (
                <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pt-0.5 pb-1">
                  {files.map((f) => (
                    <PendingAttachment key={f.localId} item={f} onRemove={() => removeFile(f.localId)} />
                  ))}
                </div>
              ) : null
            }
            onSend={(text) => send(text)}
            onStop={onStop}
          />
        </div>
      )}
    </div>
  )
}
