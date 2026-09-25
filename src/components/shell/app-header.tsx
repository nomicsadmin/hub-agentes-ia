"use client"

import { ListIcon } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useShell } from "./shell-context"

/*
 * Cabeçalho das páginas do app (52px). No celular mostra o ☰ que
 * abre a gaveta com a barra lateral. Use em qualquer página dentro
 * de (app), inclusive no /admin.
 */
export function AppHeader({
  title,
  actions,
  className,
}: {
  title?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  const { openDrawer } = useShell()
  return (
    <header
      className={cn(
        "flex h-(--header-h) shrink-0 items-center gap-1 px-2 pt-[env(safe-area-inset-top)] max-md:h-[calc(var(--header-h)+env(safe-area-inset-top))] md:px-3",
        className
      )}
    >
      <button
        type="button"
        aria-label="Abrir menu"
        onClick={openDrawer}
        className="flex size-11 shrink-0 items-center justify-center rounded-control text-ink transition-colors hover:bg-hover md:hidden"
      >
        <ListIcon className="size-[22px]" />
      </button>
      <div className="flex min-w-0 flex-1 items-center">
        {typeof title === "string" ? <h1 className="truncate px-1.5 text-body font-semibold text-ink">{title}</h1> : title}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
    </header>
  )
}

/* Área de conteúdo das páginas de lista (pastas, tags, lixeira...). */
export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div
        className={cn(
          "mx-auto w-full max-w-(--thread-w) px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+32px)] md:px-6 md:pt-6",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
