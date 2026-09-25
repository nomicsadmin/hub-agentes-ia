"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Sheet } from "@/components/app/sheet"
import { SearchDialog } from "@/components/app/search-dialog"
import type { ConversationSummary } from "@/components/app/types"
import { RAIL_COOKIE } from "./constants"
import { ShellContext, type ShellApi } from "./shell-context"
import { Sidebar } from "./sidebar"


/*
 * CASCA DO APP
 * Desktop (≥ 768px): barra lateral de 260px que recolhe para um
 * trilho de ícones (lembrado em cookie). Celular: gaveta que
 * desliza da esquerda, aberta pelo ☰ do cabeçalho.
 * Altura 100dvh; cada página cuida da própria rolagem.
 */
export function AppShell({
  conversations,
  initialCollapsed,
  children,
}: {
  conversations: ConversationSummary[]
  initialCollapsed: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  /* navegou: fecha a gaveta */
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setDrawerOpen(false)
  }

  /* ⌘K / Ctrl+K abre a busca */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setDrawerOpen(false)
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const api = useMemo<ShellApi>(
    () => ({
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      openSearch: () => {
        setDrawerOpen(false)
        setSearchOpen(true)
      },
      collapsed,
      toggleCollapsed: () =>
        setCollapsed((c) => {
          const next = !c
          document.cookie = `${RAIL_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`
          return next
        }),
    }),
    [collapsed]
  )

  return (
    <ShellContext.Provider value={api}>
      <div className="flex h-dvh w-full overflow-hidden bg-canvas">
        <aside
          className={cn(
            "hidden shrink-0 border-r border-line bg-rail transition-[width] duration-200 ease-out md:block",
            collapsed ? "w-[60px]" : "w-(--rail-w)"
          )}
        >
          <Sidebar conversations={conversations} mode={collapsed ? "rail" : "full"} />
        </aside>

        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen} side="left" title="Menu" hideTitle>
          <Sidebar conversations={conversations} inDrawer />
        </Sheet>

        <main id="conteudo" className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} recent={conversations} />
    </ShellContext.Provider>
  )
}
