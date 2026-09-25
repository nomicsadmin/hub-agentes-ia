"use client"

import { createContext, useContext, useEffect, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  CheckIcon,
  FolderSimpleIcon,
  FolderSimplePlusIcon,
  PencilSimpleIcon,
  PushPinIcon,
  PushPinSlashIcon,
  TagIcon,
  TrashIcon,
  TrashSimpleIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import {
  createFolder,
  createTag,
  deleteForever,
  moveToFolder,
  moveToTrash,
  renameConversation,
  restoreConversation,
  setArchived,
  setConversationTag,
  setPinned,
  type ActionResult,
} from "@/app/(app)/actions"
import { useAppData } from "./app-data"
import { Sheet, SheetAction } from "./sheet"
import type { ConversationSummary } from "./types"

/* ─────────────────────────────────────────────────────────
 * AÇÕES DA CONVERSA
 * Renomear, fixar, mover para pasta, tags, arquivar, apagar
 * (lixeira), restaurar e apagar para sempre. No desktop vêm num
 * DropdownMenu; no celular, num bottom sheet (toque longo).
 * Os diálogos vivem aqui, uma vez só, fora dos menus.
 * ───────────────────────────────────────────────────────── */

export type ConvRef = Pick<ConversationSummary, "id" | "title" | "pinned" | "folder_id" | "archived_at" | "deleted_at">

type Api = {
  openSheet: (c: ConvRef) => void
  rename: (c: ConvRef) => void
  editTags: (c: ConvRef) => void
  pickFolder: (c: ConvRef) => void
  move: (c: ConvRef, folderId: string | null) => void
  togglePin: (c: ConvRef) => void
  toggleArchive: (c: ConvRef) => void
  trash: (c: ConvRef) => void
  restore: (c: ConvRef) => void
  destroy: (c: ConvRef) => void
}

const Ctx = createContext<Api | null>(null)

export function useConversationActions() {
  const api = useContext(Ctx)
  if (!api) throw new Error("useConversationActions fora do ConversationActionsProvider")
  return api
}

function report(result: ActionResult<unknown>, success?: string) {
  if (!result.ok) toast.error(result.error)
  else if (success) toast(success)
  return result.ok
}

export function ConversationActionsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { folders } = useAppData()
  const [sheet, setSheet] = useState<ConvRef | null>(null)
  const [renaming, setRenaming] = useState<ConvRef | null>(null)
  const [tagging, setTagging] = useState<ConvRef | null>(null)
  const [foldering, setFoldering] = useState<ConvRef | null>(null)
  const [destroying, setDestroying] = useState<ConvRef | null>(null)
  const [pending, startTransition] = useTransition()

  const leaveIfOpen = (id: string) => {
    if (pathname === `/chat/${id}`) router.push("/chat")
  }

  const api: Api = {
    openSheet: (c) => setSheet(c),
    rename: (c) => setRenaming(c),
    editTags: (c) => setTagging(c),
    pickFolder: (c) => setFoldering(c),
    move: (c, folderId) =>
      startTransition(async () => {
        const name = folders.find((f) => f.id === folderId)?.name
        report(await moveToFolder(c.id, folderId), folderId ? `Movida para ${name ?? "a pasta"}` : "Removida da pasta")
      }),
    togglePin: (c) =>
      startTransition(async () => {
        report(await setPinned(c.id, !c.pinned), c.pinned ? "Conversa desafixada" : "Conversa fixada")
      }),
    toggleArchive: (c) =>
      startTransition(async () => {
        const archiving = !c.archived_at
        const ok = report(await setArchived(c.id, archiving))
        if (!ok) return
        if (archiving) {
          toast("Conversa arquivada", {
            action: { label: "Desfazer", onClick: () => void setArchived(c.id, false) },
          })
        } else toast("Conversa desarquivada")
      }),
    trash: (c) =>
      startTransition(async () => {
        const ok = report(await moveToTrash(c.id))
        if (!ok) return
        leaveIfOpen(c.id)
        toast("Conversa movida para a lixeira", {
          action: { label: "Desfazer", onClick: () => void restoreConversation(c.id) },
        })
      }),
    restore: (c) =>
      startTransition(async () => {
        report(await restoreConversation(c.id), "Conversa restaurada")
      }),
    destroy: (c) => setDestroying(c),
  }

  const close = () => setSheet(null)
  const later = (fn: () => void) => {
    // fecha o sheet antes de abrir o diálogo
    close()
    setTimeout(fn, 120)
  }

  return (
    <Ctx.Provider value={api}>
      {children}

      <Sheet open={!!sheet} onOpenChange={(o) => !o && close()} title={sheet?.title ?? "Conversa"}>
        {sheet && (
          <div className="flex flex-col px-2 pb-1">
            {sheet.deleted_at ? (
              <>
                <SheetAction
                  icon={<ArrowCounterClockwiseIcon />}
                  label="Restaurar"
                  onClick={() => {
                    api.restore(sheet)
                    close()
                  }}
                />
                <SheetAction
                  danger
                  icon={<TrashIcon />}
                  label="Apagar para sempre"
                  onClick={() => later(() => api.destroy(sheet))}
                />
              </>
            ) : (
              <>
                <SheetAction icon={<PencilSimpleIcon />} label="Renomear" onClick={() => later(() => api.rename(sheet))} />
                <SheetAction
                  icon={sheet.pinned ? <PushPinSlashIcon /> : <PushPinIcon />}
                  label={sheet.pinned ? "Desafixar" : "Fixar"}
                  onClick={() => {
                    api.togglePin(sheet)
                    close()
                  }}
                />
                <SheetAction
                  icon={<FolderSimpleIcon />}
                  label="Mover para pasta"
                  onClick={() => later(() => api.pickFolder(sheet))}
                />
                <SheetAction icon={<TagIcon />} label="Tags" onClick={() => later(() => api.editTags(sheet))} />
                <SheetAction
                  icon={<ArchiveIcon />}
                  label={sheet.archived_at ? "Desarquivar" : "Arquivar"}
                  onClick={() => {
                    api.toggleArchive(sheet)
                    close()
                  }}
                />
                <SheetAction
                  danger
                  icon={<TrashSimpleIcon />}
                  label="Apagar"
                  onClick={() => {
                    api.trash(sheet)
                    close()
                  }}
                />
              </>
            )}
          </div>
        )}
      </Sheet>

      <RenameDialog conv={renaming} onClose={() => setRenaming(null)} />
      <TagsDialog conv={tagging} onClose={() => setTagging(null)} />
      <FolderDialog conv={foldering} onClose={() => setFoldering(null)} onMove={api.move} />

      <Dialog open={!!destroying} onOpenChange={(o) => !o && setDestroying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apagar para sempre?</DialogTitle>
            <DialogDescription>
              “{destroying?.title}” e os arquivos dela serão apagados. Não dá para desfazer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" size="lg" className="max-sm:w-full" />}>Cancelar</DialogClose>
            <Button
              variant="danger"
              size="lg"
              className="max-sm:w-full"
              disabled={pending}
              onClick={() => {
                const c = destroying
                if (!c) return
                startTransition(async () => {
                  const ok = report(await deleteForever(c.id), "Conversa apagada para sempre")
                  if (ok) {
                    leaveIfOpen(c.id)
                    setDestroying(null)
                  }
                })
              }}
            >
              Apagar para sempre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  )
}

/* Itens do DropdownMenu (desktop) */
export function ConversationMenuItems({ conv }: { conv: ConvRef }) {
  const api = useConversationActions()
  const { folders } = useAppData()

  if (conv.deleted_at) {
    return (
      <>
        <DropdownMenuItem onClick={() => api.restore(conv)}>
          <ArrowCounterClockwiseIcon />
          Restaurar
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => api.destroy(conv)}>
          <TrashIcon />
          Apagar para sempre
        </DropdownMenuItem>
      </>
    )
  }

  return (
    <>
      <DropdownMenuItem onClick={() => api.rename(conv)}>
        <PencilSimpleIcon />
        Renomear
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => api.togglePin(conv)}>
        {conv.pinned ? <PushPinSlashIcon /> : <PushPinIcon />}
        {conv.pinned ? "Desafixar" : "Fixar"}
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <FolderSimpleIcon />
          Mover para pasta
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="max-w-64">
          {folders.map((f) => (
            <DropdownMenuItem key={f.id} onClick={() => api.move(conv, f.id)}>
              <FolderSimpleIcon />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              {conv.folder_id === f.id && <CheckIcon weight="bold" className="size-3.5" />}
            </DropdownMenuItem>
          ))}
          {folders.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={() => api.pickFolder(conv)}>
            <FolderSimplePlusIcon />
            Nova pasta…
          </DropdownMenuItem>
          {conv.folder_id && (
            <DropdownMenuItem onClick={() => api.move(conv, null)}>
              <ArrowCounterClockwiseIcon />
              Tirar da pasta
            </DropdownMenuItem>
          )}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuItem onClick={() => api.editTags(conv)}>
        <TagIcon />
        Tags…
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => api.toggleArchive(conv)}>
        <ArchiveIcon />
        {conv.archived_at ? "Desarquivar" : "Arquivar"}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onClick={() => api.trash(conv)}>
        <TrashSimpleIcon />
        Apagar
      </DropdownMenuItem>
    </>
  )
}

/* ── Diálogos ──────────────────────────────────────────── */

function RenameDialog({ conv, onClose }: { conv: ConvRef | null; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  return (
    <Dialog open={!!conv} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (!conv) return
            const title = String(new FormData(e.currentTarget).get("title") ?? "")
            startTransition(async () => {
              if (report(await renameConversation(conv.id, title), "Conversa renomeada")) onClose()
            })
          }}
        >
          <DialogHeader>
            <DialogTitle>Renomear conversa</DialogTitle>
          </DialogHeader>
          <Input
            key={conv?.id}
            name="title"
            aria-label="Título da conversa"
            defaultValue={conv?.title}
            maxLength={120}
            autoFocus
            required
            className="h-11 text-body"
          />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="secondary" size="lg" className="max-sm:w-full" />}>
              Cancelar
            </DialogClose>
            <Button type="submit" size="lg" disabled={pending} className="max-sm:w-full">
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FolderDialog({
  conv,
  onClose,
  onMove,
}: {
  conv: ConvRef | null
  onClose: () => void
  onMove: (c: ConvRef, folderId: string | null) => void
}) {
  const { folders } = useAppData()
  const [pending, startTransition] = useTransition()
  return (
    <Dialog open={!!conv} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover para pasta</DialogTitle>
          <DialogDescription className="truncate">{conv?.title}</DialogDescription>
        </DialogHeader>
        {folders.length > 0 && (
          <div className="-mx-2 flex max-h-72 flex-col overflow-y-auto">
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  if (!conv) return
                  onMove(conv, f.id)
                  onClose()
                }}
                className="flex h-11 items-center gap-3 rounded-control px-2.5 text-left text-ui text-ink transition-colors hover:bg-hover"
              >
                <FolderSimpleIcon className="size-[18px] text-ink-2" />
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                {conv?.folder_id === f.id && <CheckIcon weight="bold" className="size-4" />}
              </button>
            ))}
            {conv?.folder_id && (
              <button
                type="button"
                onClick={() => {
                  onMove(conv, null)
                  onClose()
                }}
                className="flex h-11 items-center gap-3 rounded-control px-2.5 text-left text-ui text-ink-2 transition-colors hover:bg-hover"
              >
                <ArrowCounterClockwiseIcon className="size-[18px]" />
                Tirar da pasta
              </button>
            )}
          </div>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!conv) return
            const form = e.currentTarget
            const name = String(new FormData(form).get("name") ?? "")
            startTransition(async () => {
              const res = await createFolder(name)
              if (!report(res)) return
              if (res.ok) {
                onMove(conv, res.data.id)
                form.reset()
                onClose()
              }
            })
          }}
        >
          <Input name="name" placeholder="Nova pasta" aria-label="Nome da nova pasta" maxLength={80} required className="h-11 text-body" />
          <Button type="submit" variant="secondary" size="lg" disabled={pending}>
            Criar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TagsDialog({ conv, onClose }: { conv: ConvRef | null; onClose: () => void }) {
  const { tags } = useAppData()
  const [selected, setSelected] = useState<Set<string> | null>(null)
  const [pending, startTransition] = useTransition()

  /* marca as tags que a conversa já tem */
  useEffect(() => {
    if (!conv) return
    let alive = true
    const supabase = createClient()
    supabase
      .from("conversation_tags")
      .select("tag_id")
      .eq("conversation_id", conv.id)
      .then(({ data }) => {
        if (alive) setSelected(new Set((data ?? []).map((r) => r.tag_id)))
      })
    return () => {
      alive = false
      setSelected(null)
    }
  }, [conv])

  const toggle = (tagId: string) => {
    if (!conv || !selected) return
    const on = !selected.has(tagId)
    setSelected((cur) => {
      const next = new Set(cur)
      if (on) next.add(tagId)
      else next.delete(tagId)
      return next
    })
    startTransition(async () => {
      const res = await setConversationTag(conv.id, tagId, on)
      if (!report(res)) {
        setSelected((cur) => {
          const next = new Set(cur)
          if (on) next.delete(tagId)
          else next.add(tagId)
          return next
        })
      }
    })
  }

  return (
    <Dialog open={!!conv} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tags</DialogTitle>
          <DialogDescription className="truncate">{conv?.title}</DialogDescription>
        </DialogHeader>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => {
              const on = selected?.has(t.id) ?? false
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  disabled={!selected}
                  onClick={() => toggle(t.id)}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-ui transition-colors disabled:opacity-40 max-sm:h-11",
                    on ? "border-ink bg-ink text-ink-inverse" : "border-line-strong text-ink hover:bg-hover"
                  )}
                >
                  {on && <CheckIcon weight="bold" className="size-3.5" />}
                  {t.name}
                </button>
              )
            })}
          </div>
        ) : (
          <p className="text-ui text-ink-2">Você ainda não tem tags. Crie a primeira abaixo.</p>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!conv) return
            const form = e.currentTarget
            const name = String(new FormData(form).get("name") ?? "")
            startTransition(async () => {
              const res = await createTag(name)
              if (!report(res) || !res.ok) return
              form.reset()
              const linked = await setConversationTag(conv.id, res.data.id, true)
              if (report(linked)) setSelected((cur) => new Set(cur).add(res.data.id))
            })
          }}
        >
          <Input name="name" placeholder="Nova tag" aria-label="Nome da nova tag" maxLength={40} required className="h-11 text-body" />
          <Button type="submit" variant="secondary" size="lg" disabled={pending}>
            Criar
          </Button>
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="primary" size="lg" className="max-sm:w-full" />}>Pronto</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
