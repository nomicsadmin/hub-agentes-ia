"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { ArchiveIcon, ArrowLeftIcon, ChatCircleIcon, CircleNotchIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Kbd } from "@/components/ui/kbd"
import { formatWhen } from "./dates"
import type { ConversationSummary } from "./types"
import { withBase } from "@/lib/base-path"

/* ─────────────────────────────────────────────────────────
 * BUSCA (⌘K)
 * Paleta centrada no desktop; tela cheia no celular. Busca em
 * títulos, mensagens e transcrições (GET /api/search).
 * ───────────────────────────────────────────────────────── */

export type SearchHit = {
  id: string
  title: string
  updated_at: string
  archived: boolean
  snippet: string | null
}

/* Destaca os termos buscados no trecho, sem HTML cru. */
function Highlight({ text, query }: { text: string; query: string }) {
  const terms = query
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1)
  if (!terms.length) return <>{text}</>
  const plain = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  // o texto sem acento tem o mesmo tamanho se cada letra perder só o acento combinado
  const sameLength = plain.length === text.length
  const marks: [number, number][] = []
  if (sameLength) {
    for (const t of terms) {
      let from = 0
      for (;;) {
        const i = plain.indexOf(t, from)
        if (i === -1) break
        marks.push([i, i + t.length])
        from = i + t.length
      }
    }
  }
  if (!marks.length) return <>{text}</>
  marks.sort((a, b) => a[0] - b[0])
  const parts: React.ReactNode[] = []
  let last = 0
  marks.forEach(([s, e], k) => {
    if (s < last) return
    if (s > last) parts.push(<Fragment key={`t${k}`}>{text.slice(last, s)}</Fragment>)
    parts.push(
      <strong key={`m${k}`} className="font-semibold text-ink">
        {text.slice(s, e)}
      </strong>
    )
    last = e
  })
  if (last < text.length) parts.push(<Fragment key="end">{text.slice(last)}</Fragment>)
  return <>{parts}</>
}

export function SearchDialog({
  open,
  onOpenChange,
  recent,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recent: ConversationSummary[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<SearchHit[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const q = query.trim()

  useEffect(() => {
    if (q.length < 2) return
    const controller = new AbortController()
    const t = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(withBase(`/api/search?q=${encodeURIComponent(q)}`), { signal: controller.signal })
        if (!res.ok) throw new Error()
        const data = (await res.json()) as { results: SearchHit[] }
        setHits(data.results)
        setActive(0)
      } catch {
        if (!controller.signal.aborted) setError("Não foi possível buscar agora. Tente de novo.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 220)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [q])

  const showingRecent = q.length < 2
  const rows: SearchHit[] = showingRecent
    ? recent.slice(0, 8).map((c) => ({ id: c.id, title: c.title, updated_at: c.updated_at, archived: false, snippet: null }))
    : (hits ?? [])

  const go = (id: string) => {
    onOpenChange(false)
    router.push(`/chat/${id}`)
  }

  const reset = () => {
    setQuery("")
    setHits(null)
    setError(null)
    setActive(0)
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-scrim duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 max-md:hidden" />
        <DialogPrimitive.Popup
          className={cn(
            "fixed z-50 flex flex-col bg-surface text-ink outline-none",
            "max-md:inset-0 max-md:pt-[env(safe-area-inset-top)] max-md:data-open:animate-in max-md:data-open:fade-in-0",
            "md:top-[12vh] md:left-1/2 md:max-h-[70vh] md:w-[min(640px,calc(100%-2rem))] md:-translate-x-1/2 md:rounded-panel md:border md:border-line md:data-open:animate-in md:data-open:fade-in-0 md:data-open:zoom-in-[0.98] md:data-closed:animate-out md:data-closed:fade-out-0"
          )}
        >
          <DialogPrimitive.Title className="sr-only">Buscar conversas</DialogPrimitive.Title>
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-2 md:px-3">
            <DialogPrimitive.Close
              aria-label="Voltar"
              className="flex size-11 shrink-0 items-center justify-center rounded-control text-ink-2 hover:bg-hover md:hidden"
            >
              <ArrowLeftIcon className="size-5" />
            </DialogPrimitive.Close>
            <MagnifyingGlassIcon className="size-5 shrink-0 text-ink-3 max-md:hidden" />
            <input
              autoFocus
              type="search"
              enterKeyHint="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                if (e.target.value.trim().length < 2) {
                  setHits(null)
                  setLoading(false)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault()
                  if (!rows.length) return
                  const next = (active + (e.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length
                  setActive(next)
                  listRef.current?.querySelector<HTMLElement>(`[data-row="${next}"]`)?.scrollIntoView({ block: "nearest" })
                }
                if (e.key === "Enter" && rows[active]) {
                  e.preventDefault()
                  go(rows[active].id)
                }
              }}
              placeholder="Buscar em títulos, mensagens e áudios"
              aria-label="Buscar conversas"
              className="h-11 min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-3 [&::-webkit-search-cancel-button]:hidden"
            />
            {loading && <CircleNotchIcon className="size-4 shrink-0 animate-spin text-ink-3" />}
            {query && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={reset}
                className="flex size-9 shrink-0 items-center justify-center rounded-control text-ink-3 hover:bg-hover hover:text-ink max-md:size-11"
              >
                <XIcon className="size-4" />
              </button>
            )}
            <Kbd className="max-md:hidden">Esc</Kbd>
          </div>

          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 pb-[max(env(safe-area-inset-bottom),8px)]">
            <p className="px-2.5 pt-1 pb-1.5 text-meta font-medium text-ink-3">
              {showingRecent ? "Recentes" : error ? "" : hits && !hits.length && !loading ? "" : "Resultados"}
            </p>
            {error && <p className="px-2.5 py-3 text-ui text-danger">{error}</p>}
            {!showingRecent && hits && hits.length === 0 && !loading && !error && (
              <p className="px-2.5 py-3 text-ui text-ink-2">Nada encontrado para “{q}”. Tente outra palavra.</p>
            )}
            {showingRecent && rows.length === 0 && (
              <p className="px-2.5 py-3 text-ui text-ink-2">Suas conversas aparecem aqui.</p>
            )}
            <ul role="listbox" aria-label="Conversas">
              {rows.map((r, i) => (
                <li key={r.id} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    data-row={i}
                    onMouseMove={() => setActive(i)}
                    onClick={() => go(r.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-control px-2.5 py-2.5 text-left transition-colors max-md:min-h-12",
                      i === active && "bg-hover"
                    )}
                  >
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center text-ink-3">
                      {r.archived ? <ArchiveIcon className="size-[18px]" /> : <ChatCircleIcon className="size-[18px]" />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate text-ui font-medium text-ink">
                          <Highlight text={r.title} query={showingRecent ? "" : q} />
                        </span>
                        <span className="shrink-0 text-micro text-ink-3">{formatWhen(r.updated_at)}</span>
                      </span>
                      {r.snippet && (
                        <span className="line-clamp-2 text-meta text-ink-2">
                          <Highlight text={r.snippet} query={q} />
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
