"use client"

import { createContext, useContext } from "react"

/* Controles do app: gaveta do celular, trilho do desktop e busca (⌘K). */
export type ShellApi = {
  openDrawer: () => void
  closeDrawer: () => void
  openSearch: () => void
  collapsed: boolean
  toggleCollapsed: () => void
}

export const ShellContext = createContext<ShellApi | null>(null)

/* Fora do app (ex.: Design System) devolve controles vazios. */
export function useShell(): ShellApi {
  return (
    useContext(ShellContext) ?? {
      openDrawer: () => {},
      closeDrawer: () => {},
      openSearch: () => {},
      collapsed: false,
      toggleCollapsed: () => {},
    }
  )
}
