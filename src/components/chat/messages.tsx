"use client"

import { useState } from "react"
import {
  ArrowClockwiseIcon,
  CheckIcon,
  CopyIcon,
  DotsThreeIcon,
  FilePdfIcon,
  PencilSimpleIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Tip } from "@/components/ui/tooltip"

/* ─────────────────────────────────────────────────────────
 * MENSAGENS
 * Usuário: balão cinza à direita (raio 18px), até 70% da largura.
 * Agente: sem balão, texto corrido à esquerda; a resposta é a
 * superfície. Ações aparecem no hover (usuário) ou ao final da
 * resposta (agente), sempre em cinza.
 * ───────────────────────────────────────────────────────── */

function ActionButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string
  onClick?: () => void
  pressed?: boolean
  children: React.ReactNode
}) {
  return (
    <Tip label={label} side="bottom">
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        onClick={onClick}
        className={cn(
          "flex size-8 items-center justify-center rounded-lg text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink max-sm:size-11 [&_svg]:size-[18px]",
          pressed && "text-ink"
        )}
      >
        {children}
      </button>
    </Tip>
  )
}

export function CopyAction({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <ActionButton
      label={copied ? "Copiado" : "Copiar"}
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {})
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      }}
    >
      {copied ? <CheckIcon weight="bold" /> : <CopyIcon />}
    </ActionButton>
  )
}

export function UserMessage({
  children,
  text,
  editable = true,
  before,
}: {
  children: React.ReactNode
  text: string
  /** mostra "Editar mensagem" (demonstração) */
  editable?: boolean
  /** conteúdo fora do balão, acima dele (anexos) */
  before?: React.ReactNode
}) {
  return (
    <div className="group/user flex flex-col items-end gap-1">
      {before}
      {children !== null && children !== undefined && children !== "" && (
        <div className="max-w-[85%] rounded-bubble sm:max-w-[70%] bg-bubble px-4 py-2.5 text-body leading-6 text-ink whitespace-pre-wrap [overflow-wrap:anywhere]">
          {children}
        </div>
      )}
      {text && (
        <div className="flex opacity-0 transition-opacity duration-150 group-hover/user:opacity-100 focus-within:opacity-100 max-md:opacity-100">
          <CopyAction text={text} />
          {editable && (
            <ActionButton label="Editar mensagem">
              <PencilSimpleIcon />
            </ActionButton>
          )}
        </div>
      )}
    </div>
  )
}

export type Vote = "up" | "down" | null

export function AssistantActions({
  text,
  onRetry,
  vote: controlledVote,
  onVote,
  pdfHref,
  showRetry = true,
}: {
  text: string
  onRetry?: () => void
  /** uso real: avaliação vinda do banco (controlada) */
  vote?: Vote
  onVote?: (vote: Vote) => void
  /** uso real: "Baixar em PDF" no lugar de "Mais opções" */
  pdfHref?: string
  showRetry?: boolean
}) {
  const [localVote, setLocalVote] = useState<Vote>(null)
  const vote = onVote ? (controlledVote ?? null) : localVote
  const setVote = (next: Vote) => {
    if (onVote) onVote(next)
    else setLocalVote(next)
  }
  return (
    <div className="-ml-1.5 flex items-center" style={{ animation: "fade-in 200ms var(--ease-out) both" }}>
      <CopyAction text={text} />
      <ActionButton
        label="Boa resposta"
        pressed={vote === "up"}
        onClick={() => {
          setVote(vote === "up" ? null : "up")
          if (vote !== "up") toast("Obrigado pelo retorno")
        }}
      >
        <ThumbsUpIcon weight={vote === "up" ? "fill" : "regular"} />
      </ActionButton>
      <ActionButton
        label="Resposta ruim"
        pressed={vote === "down"}
        onClick={() => {
          setVote(vote === "down" ? null : "down")
          if (vote !== "down" && onVote) toast("Obrigado. Vamos usar isso para melhorar o agente.")
        }}
      >
        <ThumbsDownIcon weight={vote === "down" ? "fill" : "regular"} />
      </ActionButton>
      {showRetry && (
        <ActionButton label="Refazer resposta" onClick={onRetry}>
          <ArrowClockwiseIcon />
        </ActionButton>
      )}
      {pdfHref ? (
        <Tip label="Baixar em PDF" side="bottom">
          <a
            href={pdfHref}
            target="_blank"
            rel="noopener"
            aria-label="Baixar em PDF"
            className="flex size-8 items-center justify-center rounded-lg text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink max-sm:size-11 [&_svg]:size-[18px]"
          >
            <FilePdfIcon />
          </a>
        </Tip>
      ) : (
        !onVote && (
          <ActionButton label="Mais opções">
            <DotsThreeIcon weight="bold" />
          </ActionButton>
        )
      )}
    </div>
  )
}

export function AssistantMessage({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3">{children}</div>
}

/* Erro dentro da conversa: diz o que houve e como resolver. Sem pedir desculpas. */
export function MessageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-control border border-danger/30 px-3.5 py-2.5 text-ui">
      <span className="text-danger">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
        >
          <ArrowClockwiseIcon className="size-4" />
          Tentar de novo
        </button>
      )}
    </div>
  )
}
