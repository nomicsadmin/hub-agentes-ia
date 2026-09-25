"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { ArrowCounterClockwiseIcon, EyeIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { restorePromptAction, savePromptAction } from "@/lib/admin/actions"
import { formatDateTime, formatNumber } from "@/lib/admin/format"
import { ConfirmDialog } from "../confirm-dialog"
import { EmptyState, Field, Panel, SectionTitle } from "../primitives"
import type { AgentDetail } from "./agent-workspace"
import { pub } from "@/config/copy"

type Version = AgentDetail["versions"][number]

export function PromptPanel({ agentId, versions }: { agentId: string; versions: Version[] }) {
  const current = versions.find((v) => v.isCurrent) ?? null
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* remonta o editor quando a versão atual muda (salvar ou restaurar) */}
      <PromptEditor key={current?.id ?? "novo"} agentId={agentId} current={current} />
      <VersionHistory agentId={agentId} versions={versions} />
    </div>
  )
}

function PromptEditor({ agentId, current }: { agentId: string; current: Version | null }) {
  const initial = current?.content ?? ""
  const [content, setContent] = useState(initial)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const dirty = content.trim() !== initial.trim()

  function save() {
    setError(null)
    start(async () => {
      const res = await savePromptAction({ agentId, content, note })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setNote("")
      toast.success("Nova versão salva. Ela vale a partir da próxima mensagem.")
    })
  }

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <SectionTitle
        title="Prompt do agente"
        description="Como o agente pensa e fala. Salvar cria uma nova versão; a anterior fica no histórico e pode ser restaurada."
      />
      {!current && (
        <EmptyState title="Este agente ainda não tem prompt.">
          Escreva as instruções abaixo e salve. Sem prompt, o agente responde só com as instruções padrão do servidor.
        </EmptyState>
      )}
      <Field
        label="Instruções"
        htmlFor="prompt-content"
        error={error}
        help={
          <span className="tabular-nums">
            {formatNumber(content.length)} caracteres · cerca de {formatNumber(Math.ceil(content.length / 4))} tokens
          </span>
        }
      >
        <Textarea
          id="prompt-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          aria-invalid={!!error}
          spellCheck
          className="field-sizing-fixed h-[60vh] min-h-80 resize-y font-mono text-meta leading-5"
          placeholder={`Você é o Agente Exemplo. Responda em português, fale com ${pub.o} ${pub.um} por você...`}
        />
      </Field>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="O que mudou (opcional)" htmlFor="prompt-note" className="flex-1">
          <Input
            id="prompt-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Ex.: reforcei o tom mais direto nas respostas"
          />
        </Field>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={!dirty || pending}
            onClick={() => {
              setContent(initial)
              setError(null)
            }}
          >
            Descartar
          </Button>
          <Button disabled={!dirty || pending} onClick={save}>
            {pending ? "Salvando..." : "Salvar nova versão"}
          </Button>
        </div>
      </div>
    </section>
  )
}

function VersionHistory({ agentId, versions }: { agentId: string; versions: Version[] }) {
  const [viewing, setViewing] = useState<Version | null>(null)
  const [restoring, setRestoring] = useState<Version | null>(null)

  return (
    <section className="flex flex-col gap-3">
      <SectionTitle title="Histórico de versões" description={`${versions.length} ${versions.length === 1 ? "versão" : "versões"}`} />
      {versions.length === 0 ? (
        <EmptyState title="Nenhuma versão ainda.">A primeira aparece aqui quando você salvar o prompt.</EmptyState>
      ) : (
        <Panel className="max-h-[70vh] divide-y divide-line overflow-y-auto">
          {versions.map((v) => (
            <div key={v.id} className="flex flex-col gap-1.5 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-meta text-ink tabular-nums">{formatDateTime(v.createdAt)}</span>
                {v.isCurrent && <Badge variant="solid">Atual</Badge>}
              </div>
              <span className="text-micro text-ink-3">por {v.author}</span>
              {v.note && <p className="text-ui text-ink-2">{v.note}</p>}
              <div className="mt-1 flex gap-1">
                <Button variant="quiet" size="sm" onClick={() => setViewing(v)}>
                  <EyeIcon />
                  Ver
                </Button>
                {!v.isCurrent && (
                  <Button variant="quiet" size="sm" onClick={() => setRestoring(v)}>
                    <ArrowCounterClockwiseIcon />
                    Restaurar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </Panel>
      )}

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Versão de {viewing ? formatDateTime(viewing.createdAt) : ""}</DialogTitle>
            <DialogDescription>
              {viewing?.note ? `${viewing.note} · ` : ""}por {viewing?.author}
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-[65vh] overflow-auto rounded-control border border-line bg-bubble p-4 font-mono text-meta whitespace-pre-wrap text-ink">
            {viewing?.content}
          </pre>
        </DialogContent>
      </Dialog>

      {restoring && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setRestoring(null)}
          title="Restaurar esta versão?"
          description={`O texto de ${formatDateTime(restoring.createdAt)} vira uma nova versão atual. A versão de agora continua no histórico.`}
          confirmLabel="Restaurar versão"
          onConfirm={async () => {
            const res = await restorePromptAction({ agentId, versionId: restoring.id })
            if (!res.ok) {
              toast.error(res.error)
              return false
            }
            toast.success("Versão restaurada.")
            return true
          }}
        />
      )}
    </section>
  )
}
