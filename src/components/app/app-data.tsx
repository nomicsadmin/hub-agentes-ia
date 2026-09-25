"use client"

import { createContext, useContext } from "react"
import type { AgentInfo, Folder, ProfileInfo, Tag } from "./types"

/* Dados do layout do app (vêm do servidor e se renovam com router.refresh). */
export type AppData = {
  profile: ProfileInfo
  agents: AgentInfo[]
  folders: Folder[]
  tags: Tag[]
}

const AppDataContext = createContext<AppData | null>(null)

export function AppDataProvider({ value, children }: { value: AppData; children: React.ReactNode }) {
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error("useAppData fora do AppDataProvider")
  return ctx
}
