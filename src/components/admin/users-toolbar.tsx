"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { MagnifyingGlassIcon } from "@phosphor-icons/react"
import { Input } from "@/components/ui/input"
import { USER_FILTERS, USER_SORTS } from "@/lib/admin/labels"
import { NativeSelect } from "./primitives"

/* Busca, filtro e ordem da tabela de usuários, guardados na URL. */
export function UsersToolbar({ query }: { query: { q: string; filtro: string; ordem: string } }) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, start] = useTransition()
  const [q, setQ] = useState(query.q)

  function update(patch: Record<string, string>) {
    const next = new URLSearchParams()
    if (q.trim()) next.set("q", q.trim())
    if (query.filtro !== "todas") next.set("filtro", query.filtro)
    if (query.ordem !== "acesso") next.set("ordem", query.ordem)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    const qs = next.toString()
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }

  // busca enquanto digita, com uma pausa curta
  useEffect(() => {
    if (query.q === q.trim()) return
    const id = setTimeout(() => update({}), 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center" aria-busy={pending}>
      <label className="relative flex-1">
        <span className="sr-only">Buscar por nome ou e-mail</span>
        <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-ink-3" />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou e-mail"
          className="pl-9"
        />
      </label>
      <div className="grid grid-cols-2 gap-2 md:flex">
        <label className="flex flex-col">
          <span className="sr-only">Filtrar</span>
          <NativeSelect value={query.filtro} onChange={(e) => update({ filtro: e.target.value === "todas" ? "" : e.target.value })}>
            {USER_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col">
          <span className="sr-only">Ordenar por</span>
          <NativeSelect value={query.ordem} onChange={(e) => update({ ordem: e.target.value === "acesso" ? "" : e.target.value })}>
            {USER_SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                Ordem: {s.label}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>
    </div>
  )
}
