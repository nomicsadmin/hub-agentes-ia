"use client"

import { useEffect } from "react"

/*
 * Menus, diálogos e dicas abrem num portal no <body>, fora do
 * wrapper do tema. Este componente aplica as classes do tema
 * também no <html> enquanto a rota estiver aberta.
 */
export function ThemeScope({ className, children }: { className: string; children: React.ReactNode }) {
  useEffect(() => {
    const classes = className.split(/\s+/).filter(Boolean)
    document.documentElement.classList.add(...classes)
    return () => document.documentElement.classList.remove(...classes)
  }, [className])
  return <>{children}</>
}
