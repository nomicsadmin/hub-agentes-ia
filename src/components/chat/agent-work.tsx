"use client"

import { useId, useState } from "react"
import { ArrowBendDownRightIcon, CaretRightIcon, CheckIcon, PauseIcon } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { LoaderGrid, ShimmerText, formatElapsed } from "./loading-state"

/* ─────────────────────────────────────────────────────────
 * O TRABALHO DO AGENTE (padrões do UI by Halaska)
 * Raciocínio: etapas visíveis enquanto pensa; depois recolhe
 * para "Pensou por 4,2 s". Fontes: pílulas no fim do trecho.
 * Próximos passos: sugestões em linha. Decisão: o agente para
 * e espera o usuário escolher.
 * ───────────────────────────────────────────────────────── */

export type Step = { title: string; detail?: string; done: boolean }

export function Reasoning({
  steps,
  thinking,
  seconds,
  defaultOpen,
}: {
  steps: Step[]
  /** ainda pensando: mostra a grade e o rótulo com brilho */
  thinking: boolean
  /** duração final, exibida quando termina */
  seconds?: number
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? thinking)
  const current = steps.find((s) => !s.done)

  return (
    <Collapsible open={thinking || open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        disabled={thinking}
        className="group/reason -ml-1 flex h-8 items-center gap-2 rounded-lg px-1 text-meta font-medium text-ink-2 transition-colors hover:text-ink disabled:cursor-default"
      >
        {thinking ? (
          <span role="status" className="flex items-center gap-2.5">
            <LoaderGrid />
            <ShimmerText>{current?.title ?? "Pensando"}</ShimmerText>
          </span>
        ) : (
          <>
            <span>Pensou por {formatElapsed(seconds ?? 0)}</span>
            <CaretRightIcon
              weight="bold"
              className="size-3 text-ink-3 transition-transform duration-200 group-data-panel-open/reason:rotate-90"
            />
          </>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ol className="mt-1 mb-1 flex flex-col gap-2.5 border-l border-line pl-4">
          {steps.map((s, i) => {
            const running = !s.done && s === current
            if (!s.done && !running) return null
            return (
              <li key={i} className="flex gap-2.5" style={{ animation: "fade-in 250ms var(--ease-out) both" }}>
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-ink-3">
                  {s.done ? <CheckIcon weight="bold" className="size-3.5" /> : <span className="size-1.5 rounded-full bg-ink-3" />}
                </span>
                <span className="flex flex-col">
                  <span className={cn("text-meta", s.done ? "text-ink-2" : "text-ink")}>{s.title}</span>
                  {s.detail && <span className="text-micro text-ink-3">{s.detail}</span>}
                </span>
              </li>
            )
          })}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  )
}

/* Pílula de fonte no fim de um trecho: o domínio, discreto. */
export function SourceChip({ label, href }: { label: string; href?: string }) {
  return (
    <a
      href={href ?? "#"}
      className="relative -top-px ml-1 inline-flex h-5 items-center rounded-full bg-bubble px-2 align-middle text-micro font-medium text-ink-2 no-underline! transition-colors hover:bg-ink hover:text-ink-inverse"
    >
      {label}
    </a>
  )
}

export function Sources({ items }: { items: { label: string; detail: string }[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-meta font-medium text-ink-2">Fontes</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => (
          <span
            key={s.label}
            className="inline-flex h-8 items-center gap-2 rounded-control border border-line px-2.5 text-meta text-ink"
          >
            <span className="font-medium">{s.label}</span>
            <span className="text-ink-3">{s.detail}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function FollowUps({ items, onPick }: { items: string[]; onPick?: (text: string) => void }) {
  return (
    <div className="flex flex-col border-t border-line pt-2">
      {items.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onPick?.(q)}
          className="group/fu -mx-2 flex min-h-10 items-center gap-2.5 rounded-control px-2 text-left text-ui text-ink-2 transition-colors hover:bg-hover hover:text-ink"
        >
          <ArrowBendDownRightIcon className="size-4 shrink-0 text-ink-3 group-hover/fu:text-ink" />
          {q}
        </button>
      ))}
    </div>
  )
}

/* O agente parou e precisa de uma decisão para continuar. */
export function DecisionCard({
  question,
  options,
  onConfirm,
  onSkip,
}: {
  question: string
  options: { title: string; detail: string }[]
  onConfirm?: (index: number) => void
  onSkip?: () => void
}) {
  const [picked, setPicked] = useState(0)
  const [resolved, setResolved] = useState<string | null>(null)
  const name = useId()

  if (resolved) {
    return (
      <div className="flex items-center gap-2 text-meta text-ink-2" style={{ animation: "fade-in 200ms var(--ease-out) both" }}>
        <CheckIcon weight="bold" className="size-3.5" />
        {resolved}
      </div>
    )
  }

  return (
    <fieldset className="rounded-panel border border-line p-1.5">
      <legend className="sr-only">{question}</legend>
      <div className="flex items-center gap-2 px-2.5 pt-2 pb-1 text-meta font-medium text-ink-2">
        <PauseIcon weight="fill" className="size-3.5" />
        Aguardando sua decisão
      </div>
      <p className="px-2.5 pb-2 text-body font-medium text-ink">{question}</p>
      <div className="flex flex-col">
        {options.map((o, i) => (
          <label
            key={o.title}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-control px-2.5 py-2.5 transition-colors hover:bg-hover",
              picked === i && "bg-hover"
            )}
          >
            <input
              type="radio"
              name={name}
              checked={picked === i}
              onChange={() => setPicked(i)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--focus)",
                picked === i ? "border-signal bg-signal" : "border-line-strong"
              )}
            >
              {picked === i && <span className="size-1.5 rounded-full bg-signal-ink" />}
            </span>
            <span className="flex flex-col">
              <span className="text-ui font-medium text-ink">{o.title}</span>
              <span className="text-meta text-ink-3">{o.detail}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2 px-1.5 pt-2 pb-1">
        <Button
          variant="quiet"
          size="sm"
          onClick={() => {
            setResolved("Você pulou esta etapa")
            onSkip?.()
          }}
        >
          Pular
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setResolved(`Você escolheu: ${options[picked].title}`)
            onConfirm?.(picked)
          }}
        >
          Continuar
        </Button>
      </div>
    </fieldset>
  )
}
