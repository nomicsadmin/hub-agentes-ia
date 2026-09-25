"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────────────────────
 * STREAMING TEXT: as palavras se resolvem por um leve
 * desfoque cruzado, uma a cada --stream-gap (60ms).
 * Técnica de transitions.dev (streaming-text). Condensa no
 * lugar em vez de parecer digitação.
 *
 * Funciona com texto que cresce (streaming real): palavras
 * novas entram na fila e aparecem em ordem.
 * ───────────────────────────────────────────────────────── */

const GAP_MS = 60

export type StreamBlock =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }

function tokenize(text: string) {
  return text.split(/(\s+)/).filter((t) => t.length > 0)
}

/* Conta palavras (tokens sem espaço) para o contador global. */
function wordCount(tokens: string[]) {
  return tokens.filter((t) => !/^\s+$/.test(t)).length
}

function Words({ tokens, offset, shown }: { tokens: string[]; offset: number; shown: number }) {
  let n = offset
  return (
    <>
      {tokens.map((tok, i) => {
        if (/^\s+$/.test(tok)) return <Fragment key={i}>{tok}</Fragment>
        const idx = n++
        return (
          <span key={i} className={cn("t-stream-w", idx < shown && "is-in")}>
            {renderInline(tok)}
          </span>
        )
      })}
    </>
  )
}

/* **negrito** dentro de uma palavra */
function renderInline(tok: string) {
  const m = /^(.*?)\*\*(.+?)\*\*(.*)$/.exec(tok)
  if (!m) return tok.replace(/\*\*/g, "")
  return (
    <>
      {m[1]}
      <strong>{m[2]}</strong>
      {m[3]}
    </>
  )
}

function useReveal(total: number, animate: boolean, onDone?: () => void) {
  const [shown, setShown] = useState(animate ? 0 : Number.POSITIVE_INFINITY)
  useEffect(() => {
    if (!animate) return
    if (shown >= total) {
      onDone?.()
      return
    }
    const t = setTimeout(() => setShown((s) => s + 1), GAP_MS)
    return () => clearTimeout(t)
    // onDone é estável o suficiente para a demo; não reinicia o ciclo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, total, animate])
  return shown
}

export function StreamingText({
  text,
  animate = true,
  className,
}: {
  text: string
  animate?: boolean
  className?: string
}) {
  const tokens = useMemo(() => tokenize(text), [text])
  const shown = useReveal(wordCount(tokens), animate)
  return (
    <p className={className}>
      <Words tokens={tokens} offset={0} shown={shown} />
    </p>
  )
}

type Run = { tokens: string[]; offset: number }
type Prepared =
  | { kind: "text"; tag: "p" | "h3"; run: Run }
  | { kind: "list"; tag: "ul" | "ol"; items: Run[] }

/* Numera as palavras de todos os blocos em sequência. */
function prepareBlocks(blocks: StreamBlock[]): { prepared: Prepared[]; total: number } {
  const prepared: Prepared[] = []
  let offset = 0
  for (const b of blocks) {
    if (b.type === "ul" || b.type === "ol") {
      const items: Run[] = []
      for (const it of b.items) {
        const tokens = tokenize(it)
        items.push({ tokens, offset })
        offset += wordCount(tokens)
      }
      prepared.push({ kind: "list", tag: b.type, items })
    } else {
      const tokens = tokenize(b.text)
      prepared.push({ kind: "text", tag: b.type, run: { tokens, offset } })
      offset += wordCount(tokens)
    }
  }
  return { prepared, total: offset }
}

/* Resposta estruturada: parágrafos, títulos e listas compartilham um contador. */
export function StreamingBlocks({
  blocks,
  animate = true,
  onDone,
}: {
  blocks: StreamBlock[]
  animate?: boolean
  onDone?: () => void
}) {
  const { prepared, total } = useMemo(() => prepareBlocks(blocks), [blocks])
  const shown = useReveal(total, animate, onDone)

  return (
    <div className="prose-chat">
      {prepared.map((b, i) => {
        if (b.kind === "list") {
          const List = b.tag
          return (
            <List key={i}>
              {b.items.map((it, j) => (
                <li key={j} className={cn(it.offset >= shown && "hidden")}>
                  <Words tokens={it.tokens} offset={it.offset} shown={shown} />
                </li>
              ))}
            </List>
          )
        }
        const Tag = b.tag
        return (
          <Tag key={i} className={cn(b.run.offset >= shown && "hidden")}>
            <Words tokens={b.run.tokens} offset={b.run.offset} shown={shown} />
          </Tag>
        )
      })}
    </div>
  )
}
