"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowCounterClockwiseIcon, DotsThreeIcon, PushPinIcon, TrashIcon } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tip } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { emptyTrash } from "@/app/(app)/actions"
import { useAppData } from "./app-data"
import { ConversationMenuItems, useConversationActions } from "./conversation-actions"
import { daysLeftInTrash, formatWhen } from "./dates"
import { ConfirmDialog } from "./dialogs"
import { useLongPress, useMediaQuery } from "./hooks"
import type { ConversationSummary } from "./types"

/* Lista de conversas das páginas do espaço (pastas, tags, fixadas, arquivadas, lixeira). */
export function ConversationList({
  items,
  variant = "default",
  retentionDays = 30,
}: {
  items: ConversationSummary[]
  variant?: "default" | "trash"
  retentionDays?: number
}) {
  return (
    <ul className="-mx-2 flex flex-col gap-px">
      {items.map((c) => (
        <li key={c.id}>
          <Row conv={c} variant={variant} retentionDays={retentionDays} />
        </li>
      ))}
    </ul>
  )
}

function Row({ conv, variant, retentionDays }: { conv: ConversationSummary; variant: "default" | "trash"; retentionDays: number }) {
  const { agents } = useAppData()
  const actions = useConversationActions()
  const mobile = useMediaQuery("(max-width: 767px)")
  const press = useLongPress(() => actions.openSheet(conv))
  const agent = agents.find((a) => a.id === conv.agent_id)
  const when =
    variant === "trash" && conv.deleted_at
      ? (() => {
          const left = daysLeftInTrash(conv.deleted_at, retentionDays)
          return left <= 0 ? "Sai da lixeira hoje" : `Sai da lixeira em ${left} ${left === 1 ? "dia" : "dias"}`
        })()
      : formatWhen(conv.updated_at)

  const iconButton =
    "flex size-9 shrink-0 items-center justify-center rounded-control text-ink-2 transition-colors hover:bg-press hover:text-ink data-popup-open:bg-press max-md:size-11"

  return (
    <div className="group/row flex items-center gap-1 rounded-control pr-1 transition-colors hover:bg-hover">
      <Link
        href={`/chat/${conv.id}`}
        {...press}
        className="flex min-h-14 min-w-0 flex-1 flex-col justify-center gap-0.5 px-3 py-2 select-none [-webkit-touch-callout:none]"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-ui font-medium text-ink">{conv.title}</span>
          {conv.pinned && <PushPinIcon weight="fill" className="size-3.5 shrink-0 text-ink-3" aria-label="Fixada" />}
        </span>
        <span className="truncate text-micro text-ink-3">
          {agent?.name ? `${agent.name} · ` : ""}
          {when}
        </span>
      </Link>

      {variant === "trash" ? (
        <>
          <Button variant="secondary" size="sm" className="max-md:hidden" onClick={() => actions.restore(conv)}>
            <ArrowCounterClockwiseIcon />
            Restaurar
          </Button>
          <Tip label="Apagar para sempre">
            <button
              type="button"
              aria-label={`Apagar para sempre: ${conv.title}`}
              onClick={() => actions.destroy(conv)}
              className={cn(iconButton, "hover:text-danger max-md:hidden")}
            >
              <TrashIcon className="size-[18px]" />
            </button>
          </Tip>
          <button type="button" aria-label={`Opções de ${conv.title}`} onClick={() => actions.openSheet(conv)} className={cn(iconButton, "md:hidden")}>
            <DotsThreeIcon weight="bold" className="size-5" />
          </button>
        </>
      ) : mobile ? (
        <button type="button" aria-label={`Opções de ${conv.title}`} onClick={() => actions.openSheet(conv)} className={iconButton}>
          <DotsThreeIcon weight="bold" className="size-5" />
        </button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger render={<button type="button" aria-label={`Opções de ${conv.title}`} className={iconButton} />}>
            <DotsThreeIcon weight="bold" className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <ConversationMenuItems conv={conv} />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

export function EmptyTrashButton({ count }: { count: number }) {
  const [open, setOpen] = useState(false)
  if (count === 0) return null
  return (
    <>
      <Button variant="quiet" size="sm" className="text-danger hover:text-danger max-md:h-11" onClick={() => setOpen(true)}>
        <TrashIcon />
        Esvaziar
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Esvaziar a lixeira?"
        description={`${count} ${count === 1 ? "conversa será apagada" : "conversas serão apagadas"} para sempre, com os arquivos. Não dá para desfazer.`}
        confirmLabel="Apagar tudo"
        success="Lixeira esvaziada"
        onConfirm={async () => {
          const res = await emptyTrash()
          return res.ok ? { ok: true } : res
        }}
      />
    </>
  )
}
