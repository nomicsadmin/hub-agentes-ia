"use client"

import { IconContext } from "@phosphor-icons/react"
import { ThemeProvider } from "next-themes"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

/* Ícones: Phosphor, traço regular, 18px como padrão da interface. */
const iconDefaults = { size: 18, weight: "regular" as const }

/*
 * Temas: claro, escuro e sistema. Os tokens de cada um ficam em
 * src/app/globals.css (:root e .dark).
 */
const THEMES = ["light", "dark"]

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      themes={THEMES}
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <IconContext.Provider value={iconDefaults}>
        <TooltipProvider>
          {children}
          <Toaster position="bottom-center" />
        </TooltipProvider>
      </IconContext.Provider>
    </ThemeProvider>
  )
}
