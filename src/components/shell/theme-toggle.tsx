"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { MoonIcon, SunIcon } from "@phosphor-icons/react"
import { Tip } from "@/components/ui/tooltip"

/* Alterna claro/escuro. */
export function ThemeToggle({ side = "bottom" }: { side?: "top" | "bottom" | "left" | "right" }) {
  const { resolvedTheme, setTheme } = useTheme()
  /* false no servidor, true no navegador: evita trocar o ícone na hidratação */
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const dark = mounted && resolvedTheme === "dark"
  const label = dark ? "Usar tema claro" : "Usar tema escuro"

  return (
    <Tip label={label} side={side}>
      <button
        type="button"
        aria-label={label}
        onClick={() => setTheme(dark ? "light" : "dark")}
        className="flex size-9 shrink-0 items-center justify-center rounded-control text-ink-2 transition-colors hover:bg-hover hover:text-ink max-md:size-11"
      >
        {dark ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
      </button>
    </Tip>
  )
}
