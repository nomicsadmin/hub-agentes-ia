"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { DotsThreeIcon, PencilSimpleIcon, PlusIcon, TagIcon, TrashIcon } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { createTag, deleteTag, renameTag } from "@/app/(app)/actions"
import { ConfirmDialog, NameDialog } from "./dialogs"

type TagRow = { id: string; name: string; count: number }

const ok = <T,>(res: { ok: true; data: T } | { ok: false; error: string }) => (res.ok ? { ok: true as const } : res)

export function NewTagButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="secondary" size="sm" className="max-md:h-11" onClick={() => setOpen(true)}>
        <PlusIcon />
        Nova tag
      </Button>
      <NameDialog
        open={open}
        onOpenChange={setOpen}
        title="Nova tag"
        label="Nome da tag"
        submitLabel="Criar tag"
        maxLength={40}
        success="Tag criada"
        onSubmit={async (name) => ok(await createTag(name))}
      />
    </>
  )
}

/* Tags como filtros: tocar escolhe (?tag=id). */
export function TagChips({ tags, selected }: { tags: TagRow[]; selected: string | null }) {
  return (
    <div className="flex flex-wrap gap-2" role="list">
      {tags.map((t) => {
        const on = t.id === selected
        return (
          <Link
            key={t.id}
            role="listitem"
            href={on ? "/tags" : `/tags?tag=${t.id}`}
            aria-current={on ? "true" : undefined}
            className={cn(
              "flex h-9 items-center gap-2 rounded-full border px-3.5 text-ui transition-colors max-md:h-11",
              on ? "border-ink bg-ink text-ink-inverse" : "border-line-strong text-ink hover:bg-hover"
            )}
          >
            <TagIcon className="size-4" />
            {t.name}
            <span className={cn("text-micro tabular-nums", on ? "text-ink-inverse/70" : "text-ink-3")}>{t.count}</span>
          </Link>
        )
      })}
    </div>
  )
}

export function TagMenu({ tag }: { tag: { id: string; name: string } }) {
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
              aria-label={`Opções da tag ${tag.name}`}
              className="flex size-9 shrink-0 items-center justify-center rounded-control text-ink-2 transition-colors hover:bg-hover hover:text-ink data-popup-open:bg-hover max-md:size-11"
            />
          }
        >
          <DotsThreeIcon weight="bold" className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setRenaming(true)}>
            <PencilSimpleIcon />
            Renomear tag
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
            <TrashIcon />
            Apagar tag
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NameDialog
        open={renaming}
        onOpenChange={setRenaming}
        title="Renomear tag"
        label="Nome da tag"
        maxLength={40}
        defaultValue={tag.name}
        success="Tag renomeada"
        onSubmit={async (name) => ok(await renameTag(tag.id, name))}
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Apagar a tag?"
        description={`A tag “${tag.name}” sai das conversas. As conversas continuam no seu histórico.`}
        confirmLabel="Apagar tag"
        success="Tag apagada"
        onConfirm={async () => {
          const res = await deleteTag(tag.id)
          if (res.ok) router.push("/tags")
          return ok(res)
        }}
      />
    </>
  )
}
