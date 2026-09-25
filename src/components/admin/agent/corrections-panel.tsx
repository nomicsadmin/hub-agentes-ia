"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { PencilSimpleIcon, PlusIcon, ThumbsDownIcon, TrashIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deleteCorrectionAction, saveCorrectionAction, toggleCorrectionAction } from "@/lib/admin/actions"
import { formatDateTime } from "@/lib/admin/format"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "../confirm-dialog"
import { EmptyState, Field, SectionTitle } from "../primitives"
import type { AgentDetail } from "./agent-workspace"

type Correction = AgentDetail["corrections"][number]
export type CorrectionDraft = { question: string; sourceMessageId: string; nonce: number }

type Mode = "qa" | "rule"
type FormState = { id?: string; mode: Mode; question: string; answer: string; rule: string; sourceMessageId?: string | null }

/* "Quando perguntarem X, responda Y" é guardado em duas linhas fixas para dar para editar depois. */
const QA = /^Quando perguntarem:\s*([\s\S]*?)\nResponda:\s*([\s\S]*)$/

function toForm(c: Correction): FormState {
  const m = c.content.match(QA)
  return m
    ? { id: c.id, mode: "qa", question: m[1].trim(), answer: m[2].trim(), rule: "", sourceMessageId: c.sourceMessageId }
    : { id: c.id, mode: "rule", question: "", answer: "", rule: c.content, sourceMessageId: c.sourceMessageId }
}

function toContent(f: FormState) {
  return f.mode === "qa" ? `Quando perguntarem: ${f.question.trim()}\nResponda: ${f.answer.trim()}` : f.rule.trim()
}

const EMPTY: FormState = { mode: "qa", question: "", answer: "", rule: "" }

export function CorrectionsPanel({
  agentId,
  corrections,
  draft,
  onDraftDone,
}: {
  agentId: string
  corrections: Correction[]
  draft: CorrectionDraft | null
  onDraftDone: () => void
}) {
  const [form, setForm] = useState<FormState | null>(null)
  const [deleting, setDeleting] = useState<Correction | null>(null)

  // "Transformar em correção" na aba Avaliações abre o formulário preenchido
  const [seenDraft, setSeenDraft] = useState<number | null>(null)
  if (draft && draft.nonce !== seenDraft) {
    setSeenDraft(draft.nonce)
    setForm({ ...EMPTY, question: draft.question, sourceMessageId: draft.sourceMessageId })
  }

  const active = corrections.filter((c) => c.isActive).length

  return (
    <section className="flex flex-col gap-4">
      <SectionTitle
        title="Correções"
        description="Regras que entram no prompt com prioridade máxima, acima dos documentos. Desative em vez de apagar se quiser testar sem ela."
        actions={
          <Button onClick={() => setForm(EMPTY)}>
            <PlusIcon />
            Nova correção
          </Button>
        }
      />

      {corrections.length === 0 ? (
        <EmptyState title="Nenhuma correção ainda.">
          Use quando o agente errar ou precisar de uma regra fixa. Exemplo: quando perguntarem o prazo de garantia, responda
          7 dias corridos. Ou: nunca invente datas que não estão no material.
        </EmptyState>
      ) : (
        <>
          <p className="text-meta font-normal text-ink-2 tabular-nums">
            {active} de {corrections.length} ativas
          </p>
          <ul className="flex flex-col divide-y divide-line rounded-control border border-line">
            {corrections.map((c) => {
              const qa = c.content.match(QA)
              return (
                <li key={c.id} className={cn("flex flex-col gap-3 p-4 sm:flex-row sm:items-start", !c.isActive && "bg-rail")}>
                  <div className={cn("flex min-w-0 flex-1 flex-col gap-1.5", !c.isActive && "opacity-60")}>
                    {qa ? (
                      <dl className="flex flex-col gap-1.5 text-ui">
                        <div>
                          <dt className="text-micro text-ink-3">Quando perguntarem</dt>
                          <dd className="whitespace-pre-wrap text-ink">{qa[1].trim()}</dd>
                        </div>
                        <div>
                          <dt className="text-micro text-ink-3">Responda</dt>
                          <dd className="whitespace-pre-wrap text-ink">{qa[2].trim()}</dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-ui whitespace-pre-wrap text-ink">{c.content}</p>
                    )}
                    <span className="flex flex-wrap items-center gap-x-2 text-micro text-ink-3">
                      <span>
                        {c.author} · {formatDateTime(c.createdAt)}
                      </span>
                      {c.sourceMessageId && (
                        <span className="inline-flex items-center gap-1">
                          <ThumbsDownIcon className="size-3" /> Veio de uma avaliação negativa
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <ToggleCorrection correction={c} />
                    <Button variant="quiet" size="icon-sm" aria-label="Editar correção" onClick={() => setForm(toForm(c))}>
                      <PencilSimpleIcon />
                    </Button>
                    <Button variant="quiet" size="icon-sm" aria-label="Apagar correção" onClick={() => setDeleting(c)}>
                      <TrashIcon />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <CorrectionForm
        agentId={agentId}
        form={form}
        onClose={() => {
          setForm(null)
          if (draft) onDraftDone()
        }}
      />

      {deleting && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setDeleting(null)}
          title="Apagar esta correção?"
          description="Ela sai do prompt do agente na próxima mensagem e não pode ser recuperada. Para pausar sem perder, use o interruptor."
          confirmLabel="Apagar correção"
          danger
          onConfirm={async () => {
            const res = await deleteCorrectionAction({ id: deleting.id })
            if (!res.ok) {
              toast.error(res.error)
              return false
            }
            toast.success("Correção apagada.")
            return true
          }}
        />
      )}
    </section>
  )
}

function ToggleCorrection({ correction }: { correction: Correction }) {
  const [checked, setChecked] = useState(correction.isActive)
  const [pending, start] = useTransition()
  return (
    <label className="flex h-8 items-center gap-2 px-2 text-meta font-normal text-ink-2">
      <Switch
        checked={checked}
        disabled={pending}
        onCheckedChange={(next) => {
          setChecked(next)
          start(async () => {
            const res = await toggleCorrectionAction({ id: correction.id, isActive: next })
            if (!res.ok) {
              setChecked(!next)
              toast.error(res.error)
            }
          })
        }}
      />
      {checked ? "Ativa" : "Pausada"}
    </label>
  )
}

function CorrectionForm({ agentId, form, onClose }: { agentId: string; form: FormState | null; onClose: () => void }) {
  const [state, setState] = useState<FormState>(form ?? EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  // novo formulário a cada abertura
  const [lastForm, setLastForm] = useState(form)
  if (form !== lastForm) {
    setLastForm(form)
    if (form) {
      setState(form)
      setError(null)
    }
  }

  function submit() {
    if (state.mode === "qa" && (!state.question.trim() || !state.answer.trim())) {
      setError("Preencha a pergunta e a resposta.")
      return
    }
    setError(null)
    start(async () => {
      const res = await saveCorrectionAction({
        agentId,
        id: state.id,
        content: toContent(state),
        sourceMessageId: state.sourceMessageId ?? null,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      toast.success(state.id ? "Correção atualizada." : "Correção criada. Ela vale a partir da próxima mensagem.")
      onClose()
    })
  }

  return (
    <Dialog open={!!form} onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{state.id ? "Editar correção" : "Nova correção"}</DialogTitle>
          <DialogDescription>
            {state.sourceMessageId
              ? "Preenchida a partir de uma resposta avaliada como ruim. Escreva a resposta certa."
              : "Seja específico: o agente segue o texto ao pé da letra."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Tabs value={state.mode} onValueChange={(mode) => setState((s) => ({ ...s, mode: mode as Mode }))}>
            <TabsList>
              <TabsTrigger value="qa">Pergunta e resposta</TabsTrigger>
              <TabsTrigger value="rule">Regra</TabsTrigger>
            </TabsList>
          </Tabs>
          {state.mode === "qa" ? (
            <>
              <Field label="Quando perguntarem" htmlFor="corr-q">
                <Textarea
                  id="corr-q"
                  value={state.question}
                  onChange={(e) => setState((s) => ({ ...s, question: e.target.value }))}
                  placeholder="Qual é o prazo de garantia?"
                  className="min-h-16"
                />
              </Field>
              <Field label="Responda" htmlFor="corr-a" error={error}>
                <Textarea
                  id="corr-a"
                  value={state.answer}
                  onChange={(e) => setState((s) => ({ ...s, answer: e.target.value }))}
                  placeholder="7 dias corridos a partir da compra, segundo o documento de políticas."
                  aria-invalid={!!error}
                  className="min-h-24"
                />
              </Field>
            </>
          ) : (
            <Field label="Regra" htmlFor="corr-rule" error={error} help="Exemplo: nunca faça promessa de faturamento.">
              <Textarea
                id="corr-rule"
                value={state.rule}
                onChange={(e) => setState((s) => ({ ...s, rule: e.target.value }))}
                placeholder="Nunca invente datas que não estão no material."
                aria-invalid={!!error}
                className="min-h-28"
              />
            </Field>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" disabled={pending} />}>Cancelar</DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : state.id ? "Salvar correção" : "Criar correção"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
