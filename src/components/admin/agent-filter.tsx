"use client"

import { useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { NativeSelect } from "./primitives"

/* Filtro por agente guardado na URL (?agente=). */
export function AgentFilter({ agents, value }: { agents: { id: string; name: string }[]; value: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, start] = useTransition()
  return (
    <label className="flex items-center gap-2" aria-busy={pending}>
      <span className="text-meta font-normal whitespace-nowrap text-ink-2">Agente</span>
      <NativeSelect
        value={value}
        onChange={(e) => {
          const id = e.target.value
          start(() => router.replace(id ? `${pathname}?agente=${id}` : pathname, { scroll: false }))
        }}
      >
        <option value="">Todos os agentes</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </NativeSelect>
    </label>
  )
}
