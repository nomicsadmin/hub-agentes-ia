"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FileTextIcon, LinkSimpleIcon, PencilSimpleIcon, TrashIcon, UploadSimpleIcon, WarningIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import {
  getDocumentAction,
  linkDocumentAction,
  setDocumentPriorityAction,
  unlinkDocumentAction,
  updateDocumentAction,
} from "@/lib/admin/actions"
import { DOC_ACCEPT, DOC_MAX_BYTES, docExtension, docMime, titleFromFileName } from "@/lib/admin/documents"
import { formatDateTime, formatNumber } from "@/lib/admin/format"
import { DOC_STATUS_LABEL } from "@/lib/admin/labels"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "../confirm-dialog"
import { DataTable, EmptyState, Field, NativeSelect, SectionTitle, Td, Th, Tr } from "../primitives"
import type { AgentDetail } from "./agent-workspace"
import { withBase } from "@/lib/base-path"

type Doc = AgentDetail["documents"][number]
type Available = AgentDetail["available"][number]

export function DocumentsPanel({
  agentId,
  documents,
  available,
  totalTokens,
  tokenLimit,
}: {
  agentId: string
  documents: Doc[]
  available: Available[]
  totalTokens: number
  tokenLimit: number
}) {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [editing, setEditing] = useState<Doc | null>(null)
  const [removing, setRemoving] = useState<Doc | null>(null)
  const over = totalTokens > tokenLimit
  const pct = Math.min(100, (totalTokens / tokenLimit) * 100)

  return (
    <section className="flex flex-col gap-4">
      <SectionTitle
        title="Documentos da base"
        description="O texto de cada documento entra no prompt do agente. Quando dois documentos dizem coisas diferentes, vale o de maior prioridade."
        actions={
          <>
            {available.length > 0 && (
              <Button variant="secondary" onClick={() => setLinkOpen(true)}>
                <LinkSimpleIcon />
                Usar documento já enviado
              </Button>
            )}
            <Button onClick={() => setUploadOpen(true)}>
              <UploadSimpleIcon />
              Enviar documento
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-2 rounded-control border border-line p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-meta text-ink-2">Tamanho da base</span>
          <span className="text-ui text-ink tabular-nums">
            <span className="font-semibold">{formatNumber(totalTokens)}</span> de {formatNumber(tokenLimit)} tokens
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-hover" aria-hidden>
          <div className={cn("h-full rounded-full", over ? "bg-ink" : "bg-ink-2")} style={{ width: `${Math.max(1, pct)}%` }} />
        </div>
        {over ? (
          <p className="flex items-start gap-2 text-ui text-ink" role="status">
            <WarningIcon className="mt-0.5 size-4 shrink-0" weight="fill" />
            <span>
              A base passou de {formatNumber(tokenLimit)} tokens. A partir daqui o agente deixa de receber o material
              inteiro e passa a usar a busca por trechos, que pode perder contexto entre as partes. Se der, remova
              documentos repetidos ou de pouca prioridade.
            </span>
          </p>
        ) : (
          <p className="text-micro text-ink-3">
            Até {formatNumber(tokenLimit)} tokens o agente lê o material inteiro a cada resposta. Acima disso passa a usar
            a busca por trechos.
          </p>
        )}
      </div>

      {documents.length === 0 ? (
        <EmptyState
          title="Nenhum documento neste agente."
          action={
            <Button variant="secondary" onClick={() => setUploadOpen(true)}>
              <UploadSimpleIcon />
              Enviar o primeiro documento
            </Button>
          }
        >
          Envie PDF, DOCX, MD ou TXT com texto selecionável. O texto é extraído na hora e você pode revisar e corrigir
          depois.
        </EmptyState>
      ) : (
        <DataTable minWidth={820} label="Documentos do agente">
          <thead>
            <tr>
              <Th>Documento</Th>
              <Th>Status</Th>
              <Th align="right">Tokens</Th>
              <Th>Prioridade</Th>
              <Th>Atualizado</Th>
              <Th>
                <span className="sr-only">Ações</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <Tr key={d.id}>
                <Td className="max-w-[320px]">
                  <span className="flex items-start gap-2">
                    <FileTextIcon className="mt-0.5 size-4 shrink-0 text-ink-3" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{d.title}</span>
                      {d.sharedWith.length > 0 && (
                        <span className="text-micro text-ink-3">Também usado por {d.sharedWith.join(", ")}</span>
                      )}
                      {d.status === "error" && d.error && <span className="text-micro text-danger">{d.error}</span>}
                    </span>
                  </span>
                </Td>
                <Td>
                  <Badge variant={d.status === "error" ? "danger" : d.status === "ready" ? "default" : "outline"}>
                    {DOC_STATUS_LABEL[d.status] ?? d.status}
                  </Badge>
                </Td>
                <Td align="right">{formatNumber(d.tokenEstimate)}</Td>
                <Td>
                  <PriorityInput agentId={agentId} doc={d} />
                </Td>
                <Td className="whitespace-nowrap text-ink-2">{formatDateTime(d.updatedAt)}</Td>
                <Td align="right" className="whitespace-nowrap">
                  <Button variant="quiet" size="sm" onClick={() => setEditing(d)}>
                    <PencilSimpleIcon />
                    Ver e editar texto
                  </Button>
                  <Button variant="quiet" size="icon-sm" aria-label={`Remover ${d.title} do agente`} onClick={() => setRemoving(d)}>
                    <TrashIcon />
                  </Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      )}

      <UploadDialog agentId={agentId} open={uploadOpen} onOpenChange={setUploadOpen} />
      <LinkDialog agentId={agentId} available={available} open={linkOpen} onOpenChange={setLinkOpen} />
      {editing && <EditDocumentDialog doc={editing} onClose={() => setEditing(null)} />}
      {removing && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setRemoving(null)}
          title="Remover do agente?"
          description={
            removing.sharedWith.length
              ? `"${removing.title}" sai da base deste agente. ${removing.sharedWith.join(", ")} continua usando.`
              : `"${removing.title}" sai da base deste agente e, como nenhum outro agente usa, o arquivo e o texto são apagados.`
          }
          confirmLabel="Remover documento"
          danger
          onConfirm={async () => {
            const res = await unlinkDocumentAction({ agentId, documentId: removing.id })
            if (!res.ok) {
              toast.error(res.error)
              return false
            }
            toast.success(res.data.deleted ? "Documento removido e apagado." : "Documento removido deste agente.")
            return true
          }}
        />
      )}
    </section>
  )
}

function PriorityInput({ agentId, doc }: { agentId: string; doc: Doc }) {
  const [value, setValue] = useState(String(doc.priority))
  const [pending, start] = useTransition()

  function commit() {
    const n = Number(value)
    if (!Number.isInteger(n) || n < 0 || n > 100) {
      toast.error("A prioridade vai de 0 a 100.")
      setValue(String(doc.priority))
      return
    }
    if (n === doc.priority) return
    start(async () => {
      const res = await setDocumentPriorityAction({ agentId, documentId: doc.id, priority: n })
      if (!res.ok) {
        toast.error(res.error)
        setValue(String(doc.priority))
      } else toast.success("Prioridade atualizada.")
    })
  }

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Prioridade de {doc.title}</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={100}
        value={value}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
        }}
        className="h-8 w-20 tabular-nums"
      />
    </label>
  )
}

type UploadStep = "idle" | "sending" | "reading"

function UploadDialog({
  agentId,
  open,
  onOpenChange,
}: {
  agentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState("0")
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<UploadStep>("idle")
  const busy = step !== "idle"

  function reset() {
    setFile(null)
    setTitle("")
    setPriority("0")
    setError(null)
    setStep("idle")
  }

  function pick(f: File | null) {
    setError(null)
    if (!f) return setFile(null)
    if (!docExtension(f.name)) {
      setError("Formato não suportado. Envie PDF, DOCX, MD ou TXT.")
      return setFile(null)
    }
    if (f.size > DOC_MAX_BYTES) {
      setError("O arquivo passa de 50 MB. Divida em partes menores.")
      return setFile(null)
    }
    setFile(f)
    if (!title) setTitle(titleFromFileName(f.name))
  }

  async function submit() {
    if (!file) {
      setError("Escolha um arquivo.")
      return
    }
    const prio = Number(priority)
    if (!Number.isInteger(prio) || prio < 0 || prio > 100) {
      setError("A prioridade vai de 0 a 100.")
      return
    }
    setError(null)
    try {
      setStep("sending")
      const sign = await fetch(withBase("/api/admin/documents/upload-url"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, filename: file.name, size: file.size }),
      })
      const signed = await sign.json().catch(() => ({}))
      if (!sign.ok) throw new Error(signed.error ?? "Não foi possível preparar o envio.")

      const { error: upError } = await createClient()
        .storage.from("knowledge")
        .uploadToSignedUrl(signed.path, signed.token, file, { contentType: docMime(file.name, file.type) })
      if (upError) throw new Error("O arquivo não foi enviado. Confira a conexão e tente de novo.")

      setStep("reading")
      const res = await fetch(withBase("/api/admin/documents"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, storagePath: signed.path, filename: file.name, title: title.trim(), priority: prio }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? "Não foi possível processar o documento.")

      if (body.document?.status === "error") {
        toast.error(`Documento enviado, mas com erro: ${body.document.error}`)
      } else if (body.document?.indexed === false) {
        toast.warning("Documento pronto, mas a busca por trechos não foi preparada. Isso só pesa quando a base passa do limite de tokens.")
      } else {
        toast.success(`Documento pronto: ${formatNumber(body.document?.tokenEstimate ?? 0)} tokens.`)
      }
      reset()
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar. Tente de novo.")
      setStep("idle")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar documento</DialogTitle>
          <DialogDescription>PDF, DOCX, MD ou TXT de até 50 MB. PDF escaneado sem texto selecionável não funciona.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Field label="Arquivo" htmlFor="doc-file" error={error}>
            <input
              id="doc-file"
              type="file"
              accept={DOC_ACCEPT}
              disabled={busy}
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
              className="block w-full rounded-control border border-line-strong bg-canvas p-2 text-ui text-ink file:mr-3 file:h-8 file:rounded-control file:border-0 file:bg-bubble file:px-3 file:text-ui file:font-medium file:text-ink"
            />
          </Field>
          <Field label="Título" htmlFor="doc-title" help="Como o documento aparece aqui e no prompt do agente.">
            <Input id="doc-title" value={title} disabled={busy} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </Field>
          <Field label="Prioridade" htmlFor="doc-priority" help="De 0 a 100. Maior vence quando dois documentos se contradizem.">
            <Input
              id="doc-priority"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={priority}
              disabled={busy}
              onChange={(e) => setPriority(e.target.value)}
              className="w-28 tabular-nums"
            />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" disabled={busy} />}>Cancelar</DialogClose>
            <Button type="submit" disabled={busy || !file}>
              {step === "sending" ? "Enviando arquivo..." : step === "reading" ? "Lendo o texto..." : "Enviar e processar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function LinkDialog({
  agentId,
  available,
  open,
  onOpenChange,
}: {
  agentId: string
  available: Available[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [documentId, setDocumentId] = useState("")
  const [priority, setPriority] = useState("0")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    const prio = Number(priority)
    if (!documentId) return setError("Escolha um documento.")
    if (!Number.isInteger(prio) || prio < 0 || prio > 100) return setError("A prioridade vai de 0 a 100.")
    setError(null)
    start(async () => {
      const res = await linkDocumentAction({ agentId, documentId, priority: prio })
      if (!res.ok) return setError(res.error)
      toast.success("Documento adicionado a este agente.")
      setDocumentId("")
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Usar documento já enviado</DialogTitle>
          <DialogDescription>
            O mesmo documento pode servir a mais de um agente. Editar o texto muda para todos que usam.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Field label="Documento" htmlFor="link-doc" error={error}>
            <NativeSelect id="link-doc" value={documentId} onChange={(e) => setDocumentId(e.target.value)}>
              <option value="">Escolha um documento</option>
              {available.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} · {formatNumber(d.token_estimate)} tokens{d.status !== "ready" ? ` · ${DOC_STATUS_LABEL[d.status] ?? d.status}` : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Prioridade neste agente" htmlFor="link-priority" help="De 0 a 100.">
            <Input
              id="link-priority"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-28 tabular-nums"
            />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" disabled={pending} />}>Cancelar</DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Adicionando..." : "Adicionar ao agente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditDocumentDialog({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const [loaded, setLoaded] = useState<{ title: string; content: string } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [title, setTitle] = useState(doc.title)
  const [content, setContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  // carrega o texto ao abrir (pode ser grande, então não vem junto com a página)
  useEffect(() => {
    let alive = true
    getDocumentAction({ documentId: doc.id }).then((res) => {
      if (!alive) return
      if (!res.ok) return setLoadError(res.error)
      const text = res.data.content ?? ""
      setLoaded({ title: res.data.title, content: text })
      setTitle(res.data.title)
      setContent(text)
    })
    return () => {
      alive = false
    }
  }, [doc.id])

  const dirty = !!loaded && (content !== loaded.content || title.trim() !== loaded.title)

  function save() {
    setError(null)
    start(async () => {
      const res = await updateDocumentAction({ documentId: doc.id, title, content })
      if (!res.ok) return setError(res.error)
      if (res.data.indexed) toast.success("Texto salvo. O agente usa a nova versão a partir da próxima mensagem.")
      else toast.warning("Texto salvo, mas a busca por trechos não foi refeita. Isso só pesa quando a base passa do limite de tokens.")
      onClose()
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Texto extraído</DialogTitle>
          <DialogDescription>
            É exatamente o que o agente lê. Corrija quebras, tabelas mal lidas ou trechos que não devem entrar.
            {doc.sharedWith.length > 0 && ` A mudança também vale para ${doc.sharedWith.join(", ")}.`}
          </DialogDescription>
        </DialogHeader>
        {loadError ? (
          <EmptyState title="Não foi possível abrir o texto.">{loadError}</EmptyState>
        ) : !loaded ? (
          <div className="flex flex-col gap-3" aria-busy>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[50vh] w-full" />
          </div>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
          >
            <Field label="Título" htmlFor="edit-doc-title">
              <Input id="edit-doc-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            </Field>
            <Field
              label="Texto"
              htmlFor="edit-doc-content"
              error={error}
              help={
                <span className="tabular-nums">
                  {formatNumber(content.length)} caracteres · cerca de {formatNumber(Math.ceil(content.length / 4))} tokens
                </span>
              }
            >
              <Textarea
                id="edit-doc-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                aria-invalid={!!error}
                className="field-sizing-fixed h-[55vh] resize-y font-mono text-meta leading-5"
              />
            </Field>
            <DialogFooter>
              <DialogClose render={<Button variant="secondary" disabled={pending} />}>
                {dirty ? "Descartar" : "Fechar"}
              </DialogClose>
              <Button type="submit" disabled={pending || !dirty}>
                {pending ? "Salvando..." : "Salvar texto"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
