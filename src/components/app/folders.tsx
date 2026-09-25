"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { DotsThreeIcon, FolderSimpleIcon, FolderSimplePlusIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { createFolder, deleteFolder, renameFolder } from "@/app/(app)/actions"
import { ConfirmDialog, EmptyState, NameDialog } from "./dialogs"

type FolderRow = { id: string; name: string; count: number }

const ok = <T,>(res: { ok: true; data: T } | { ok: false; error: string }) => (res.ok ? { ok: true as const } : res)

export function NewFolderButton({ variant = "secondary" }: { variant?: "secondary" | "primary" }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant={variant} size="sm" className="max-md:h-11" onClick={() => setOpen(true)}>
        <FolderSimplePlusIcon />
        Nova pasta
      </Button>
      <NameDialog
        open={open}
        onOpenChange={setOpen}
        title="Nova pasta"
        label="Nome da pasta"
        submitLabel="Criar pasta"
        success="Pasta criada"
        onSubmit={async (name) => ok(await createFolder(name))}
      />
    </>
  )
}

export function FoldersView({ folders }: { folders: FolderRow[] }) {
  if (folders.length === 0) {
    return (
      <EmptyState
        icon={<FolderSimpleIcon />}
        title="Nenhuma pasta ainda"
        text="Crie pastas para separar conversas por projeto, fase ou cliente."
        action={<NewFolderButton variant="primary" />}
      />
    )
  }
  return (
    <ul className="-mx-2 flex flex-col gap-px">
      {folders.map((f) => (
        <li key={f.id} className="group/row flex items-center gap-1 rounded-control pr-1 transition-colors hover:bg-hover">
          <Link href={`/pastas/${f.id}`} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 py-2">
            <FolderSimpleIcon className="size-5 shrink-0 text-ink-2" />
            <span className="min-w-0 flex-1 truncate text-ui font-medium text-ink">{f.name}</span>
            <span className="shrink-0 text-micro text-ink-3 tabular-nums">
              {f.count} {f.count === 1 ? "conversa" : "conversas"}
            </span>
          </Link>
          <FolderMenu folder={f} />
        </li>
      ))}
    </ul>
  )
}

/* Renomear e apagar uma pasta (lista e página da pasta). */
export function FolderMenu({ folder, afterDelete }: { folder: { id: string; name: string }; afterDelete?: string }) {
  const router = useRouter()
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label={`Opções da pasta ${folder.name}`}
              className="flex size-9 shrink-0 items-center justify-center rounded-control text-ink-2 transition-colors hover:bg-press hover:text-ink data-popup-open:bg-press max-md:size-11"
            />
          }
        >
          <DotsThreeIcon weight="bold" className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setRenaming(true)}>
            <PencilSimpleIcon />
            Renomear
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
            <TrashIcon />
            Apagar pasta
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NameDialog
        open={renaming}
        onOpenChange={setRenaming}
        title="Renomear pasta"
        label="Nome da pasta"
        defaultValue={folder.name}
        success="Pasta renomeada"
        onSubmit={async (name) => ok(await renameFolder(folder.id, name))}
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Apagar a pasta?"
        description={`A pasta “${folder.name}” some, mas as conversas continuam no seu histórico.`}
        confirmLabel="Apagar pasta"
        success="Pasta apagada"
        onConfirm={async () => {
          const res = await deleteFolder(folder.id)
          if (res.ok && afterDelete) router.push(afterDelete)
          return ok(res)
        }}
      />
    </>
  )
}
