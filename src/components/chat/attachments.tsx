"use client"

import { useEffect, useRef, useState } from "react"
import {
  CaretDownIcon,
  CircleNotchIcon,
  DownloadSimpleIcon,
  FilePdfIcon,
  ImageIcon,
  PauseIcon,
  PlayIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { formatBytes } from "./upload"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { withBase } from "@/lib/base-path"

/* ─────────────────────────────────────────────────────────
 * ANEXOS
 * Prévia no compositor, anexos na mensagem do usuário (imagem,
 * PDF, áudio com transcrição) e o cartão do PDF gerado pelo
 * agente. Sem cor: linha de 1px, véu no hover.
 * ───────────────────────────────────────────────────────── */

export type PendingFile = {
  localId: string
  file: File
  kind: "image" | "pdf"
  previewUrl: string | null
  status: "uploading" | "ready" | "error"
  error?: string
  uploadedId?: string
}

/* Prévia no compositor, antes de enviar */
export function PendingAttachment({ item, onRemove }: { item: PendingFile; onRemove: () => void }) {
  const [broken, setBroken] = useState(false)
  const showImage = item.kind === "image" && item.previewUrl && !broken
  return (
    <div
      className={cn(
        "relative flex h-14 max-w-56 items-center gap-2.5 rounded-control border bg-canvas py-1.5 pr-9 pl-1.5 dark:bg-bubble",
        item.status === "error" ? "border-danger/40" : "border-line"
      )}
      style={{ animation: "pop-in 200ms var(--ease-out) both" }}
    >
      <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-bubble text-ink-2">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.previewUrl!} alt="" className="size-full object-cover" onError={() => setBroken(true)} />
        ) : item.kind === "pdf" ? (
          <FilePdfIcon className="size-5" />
        ) : (
          <ImageIcon className="size-5" />
        )}
        {item.status === "uploading" && (
          <span className="absolute inset-0 flex items-center justify-center bg-canvas/70 text-ink">
            <CircleNotchIcon className="size-4 animate-spin" />
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-meta font-medium text-ink">{item.file.name}</span>
        <span className={cn("truncate text-micro", item.status === "error" ? "text-danger" : "text-ink-3")}>
          {item.status === "error" ? (item.error ?? "Falhou") : item.status === "uploading" ? "Enviando…" : formatBytes(item.file.size)}
        </span>
      </span>
      <button
        type="button"
        aria-label={`Remover ${item.file.name}`}
        onClick={onRemove}
        className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-hover hover:text-ink"
      >
        <XIcon className="size-3.5" weight="bold" />
      </button>
    </div>
  )
}

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const s = Math.floor(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

/* Player compacto: tocar/pausar, barra de progresso e tempo. */
export function AudioPlayer({ src, className }: { src: string | null | undefined; className?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onMeta = () => {
      // webm gravado no Chrome vem sem duração: força o cálculo
      if (!Number.isFinite(a.duration)) {
        a.currentTime = 1e7
        const fix = () => {
          a.removeEventListener("timeupdate", fix)
          setDuration(Number.isFinite(a.duration) ? a.duration : 0)
          a.currentTime = 0
        }
        a.addEventListener("timeupdate", fix)
      } else setDuration(a.duration)
    }
    const onTime = () => setTime(a.currentTime)
    const onEnd = () => {
      setPlaying(false)
      setTime(0)
    }
    const onPause = () => setPlaying(false)
    const onPlay = () => setPlaying(true)
    a.addEventListener("loadedmetadata", onMeta)
    a.addEventListener("timeupdate", onTime)
    a.addEventListener("ended", onEnd)
    a.addEventListener("pause", onPause)
    a.addEventListener("play", onPlay)
    return () => {
      a.removeEventListener("loadedmetadata", onMeta)
      a.removeEventListener("timeupdate", onTime)
      a.removeEventListener("ended", onEnd)
      a.removeEventListener("pause", onPause)
      a.removeEventListener("play", onPlay)
    }
  }, [src])

  const progress = duration > 0 ? Math.min(1, time / duration) : 0

  return (
    <div className={cn("flex h-12 w-64 max-w-full items-center gap-2.5 rounded-bubble bg-bubble pr-4 pl-1.5", className)}>
      <audio ref={audioRef} src={src ?? undefined} preload="metadata" />
      <button
        type="button"
        disabled={!src}
        aria-label={playing ? "Pausar áudio" : "Ouvir áudio"}
        onClick={() => {
          const a = audioRef.current
          if (!a) return
          if (a.paused) void a.play().catch(() => {})
          else a.pause()
        }}
        className="flex size-9 shrink-0 items-center justify-center rounded-full fill-primary transition-transform active:scale-95 disabled:opacity-40 max-sm:size-10"
      >
        {playing ? <PauseIcon weight="fill" className="size-4" /> : <PlayIcon weight="fill" className="size-4" />}
      </button>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Posição do áudio"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(time)}
        onClick={(e) => {
          const a = audioRef.current
          if (!a || !duration) return
          const rect = e.currentTarget.getBoundingClientRect()
          a.currentTime = ((e.clientX - rect.left) / rect.width) * duration
        }}
        onKeyDown={(e) => {
          const a = audioRef.current
          if (!a || !duration) return
          if (e.key === "ArrowRight") a.currentTime = Math.min(duration, a.currentTime + 5)
          if (e.key === "ArrowLeft") a.currentTime = Math.max(0, a.currentTime - 5)
        }}
        className="relative flex h-8 min-w-0 flex-1 cursor-pointer items-center"
      >
        <span className="h-1 w-full overflow-hidden rounded-full bg-line-strong">
          <span className="block h-full rounded-full bg-ink" style={{ width: `${progress * 100}%` }} />
        </span>
      </div>
      <span className="shrink-0 font-mono text-micro text-ink-2 tabular-nums">
        {formatClock(playing || time > 0 ? time : duration)}
      </span>
    </div>
  )
}

/* Áudio do usuário: player + "Ver transcrição" */
export function AudioMessage({ src, transcript, pending }: { src?: string | null; transcript?: string | null; pending?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex max-w-[85%] flex-col items-end gap-1 sm:max-w-[70%]">
      <AudioPlayer src={src} />
      {pending ? (
        <span className="flex h-8 items-center gap-1.5 px-1 text-micro text-ink-3">
          <CircleNotchIcon className="size-3.5 animate-spin" />
          Transcrevendo o áudio
        </span>
      ) : (
        transcript && (
          <>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((c) => !c)}
              className="flex h-8 items-center gap-1 rounded-md px-1.5 text-micro font-medium text-ink-2 transition-colors hover:text-ink max-sm:h-11"
            >
              {open ? "Ocultar transcrição" : "Ver transcrição"}
              <CaretDownIcon className={cn("size-3 transition-transform", open && "rotate-180")} weight="bold" />
            </button>
            {open && (
              <p
                className="rounded-control border border-line px-3.5 py-2.5 text-ui text-ink-2 whitespace-pre-wrap"
                style={{ animation: "fade-in 200ms var(--ease-out) both" }}
              >
                {transcript}
              </p>
            )}
          </>
        )
      )}
    </div>
  )
}

/* Imagem enviada pelo usuário: clique abre o popup com o botão de baixar */
export function ImageThumb({ id, src, title }: { id?: string; src?: string | null; title?: string | null }) {
  const [broken, setBroken] = useState(false)
  const [open, setOpen] = useState(false)
  const label = title ?? "Imagem enviada"
  const body =
    src && !broken ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={label} className="size-full object-cover" onError={() => setBroken(true)} />
    ) : (
      <span className="flex size-full flex-col items-center justify-center gap-1 px-2 text-ink-3">
        <ImageIcon className="size-6" />
        <span className="w-full truncate text-center text-micro">{title ?? "Imagem"}</span>
      </span>
    )
  const frame = "block size-28 overflow-hidden rounded-control border border-line bg-bubble sm:size-32"
  if (!src || broken) return <span className={frame}>{body}</span>

  // anexos salvos baixam pela rota com URL assinada; a prévia local baixa direto do arquivo
  const downloadHref = id ? withBase(`/api/pdf/${id}?download=1`) : src

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={`Ampliar ${label}`}
            className={cn(frame, "cursor-zoom-in transition-[border-color] hover:border-line-strong")}
          />
        }
      >
        {body}
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-2rem)] w-auto max-w-[calc(100vw-2rem)] flex-col gap-3 p-3 sm:max-w-[min(calc(100vw-4rem),1100px)]"
      >
        <div className="flex items-center gap-2 pl-1">
          <DialogTitle className="min-w-0 flex-1 truncate text-ui! font-medium! normal-case! tracking-normal!">
            {label}
          </DialogTitle>
          <Button
            variant="secondary"
            size="sm"
            nativeButton={false}
            render={<a href={downloadHref} download={title ?? true} />}
            className="no-underline"
          >
            <DownloadSimpleIcon />
            Baixar imagem
          </Button>
          <DialogClose
            render={<Button variant="quiet" size="icon-sm" aria-label="Fechar" />}
          >
            <XIcon />
          </DialogClose>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={label}
          className="mx-auto max-h-[calc(100dvh-7rem)] w-auto max-w-full rounded-control object-contain"
        />
      </DialogContent>
    </Dialog>
  )
}

/* PDF (enviado pelo usuário ou gerado pelo agente) */
export function PdfCard({
  title,
  href,
  generated,
  className,
}: {
  title: string | null | undefined
  href?: string | null
  generated?: boolean
  className?: string
}) {
  const Tag = href ? "a" : "div"
  return (
    <Tag
      {...(href ? { href, target: "_blank", rel: "noopener" } : {})}
      className={cn(
        "group/pdf flex min-h-14 w-full max-w-80 items-center gap-3 rounded-control border border-line bg-surface px-3 py-2 text-left transition-colors",
        href && "hover:border-line-strong hover:bg-hover",
        className
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-bubble text-ink">
        <FilePdfIcon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-ui font-medium text-ink">{title || "Documento em PDF"}</span>
        <span className="text-micro text-ink-3">{generated ? "PDF gerado pelo agente" : "PDF"}</span>
      </span>
      {href && (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors group-hover/pdf:text-ink">
          <DownloadSimpleIcon className="size-[18px]" />
          <span className="sr-only">Baixar</span>
        </span>
      )}
    </Tag>
  )
}

export function AttachmentError({ message }: { message: string }) {
  return (
    <span className="flex items-center gap-1.5 text-micro text-danger">
      <WarningCircleIcon className="size-3.5" />
      {message}
    </span>
  )
}
