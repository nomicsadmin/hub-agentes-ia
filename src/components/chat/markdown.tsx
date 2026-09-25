"use client"

import { Fragment, createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { CodeBlock } from "./code-block"

/* ─────────────────────────────────────────────────────────
 * MARKDOWN DA RESPOSTA (seguro)
 * Parser próprio, sem HTML cru: tudo vira elemento React e o
 * texto é sempre escapado. Cobre o que o agente escreve:
 * títulos, parágrafos, negrito, itálico, código, listas
 * (inclusive aninhadas e checklist), citações, linha, tabela
 * e links http(s)/mailto.
 *
 * Em streaming, cada palavra nova entra com um leve fade; as
 * que já estavam na tela não animam de novo (chave estável).
 * ───────────────────────────────────────────────────────── */

type Block =
  | { type: "h"; level: 2 | 3; text: string }
  | { type: "p"; lines: string[] }
  | { type: "list"; ordered: boolean; start: number; items: { text: string; checked: boolean | null; children: Block[] }[] }
  | { type: "quote"; children: Block[] }
  | { type: "hr" }
  | { type: "code"; lang: string; code: string }
  | { type: "table"; header: string[]; rows: string[][] }

const LIST_RE = /^(\s*)([-*+]|\d{1,3}[.)])\s+(.*)$/
const HR_RE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/
const HEADING_RE = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/
const FENCE_RE = /^\s{0,3}(```|~~~)\s*([\w+-]*)\s*$/
const TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/

const indentOf = (line: string) => line.match(/^\s*/)?.[0].replace(/\t/g, "  ").length ?? 0
const splitRow = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim())

function isBlockStart(line: string, next?: string) {
  return (
    HEADING_RE.test(line) ||
    FENCE_RE.test(line) ||
    HR_RE.test(line) ||
    LIST_RE.test(line) ||
    /^\s{0,3}>/.test(line) ||
    (line.includes("|") && next !== undefined && TABLE_SEP_RE.test(next))
  )
}

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n")
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }

    const fence = FENCE_RE.exec(line)
    if (fence) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) code.push(lines[i++])
      i++ // fecha (ou fim do texto, em streaming)
      blocks.push({ type: "code", lang: fence[2] || "texto", code: code.join("\n") })
      continue
    }

    const heading = HEADING_RE.exec(line)
    if (heading) {
      blocks.push({ type: "h", level: heading[1].length <= 2 ? 2 : 3, text: heading[2] })
      i++
      continue
    }

    if (HR_RE.test(line)) {
      blocks.push({ type: "hr" })
      i++
      continue
    }

    if (/^\s{0,3}>/.test(line)) {
      const inner: string[] = []
      while (i < lines.length && /^\s{0,3}>/.test(lines[i])) inner.push(lines[i++].replace(/^\s{0,3}>\s?/, ""))
      blocks.push({ type: "quote", children: parseBlocks(inner.join("\n")) })
      continue
    }

    if (line.includes("|") && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1])) {
      const header = splitRow(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) rows.push(splitRow(lines[i++]))
      blocks.push({ type: "table", header, rows })
      continue
    }

    const first = LIST_RE.exec(line)
    if (first) {
      const base = indentOf(line)
      const ordered = /\d/.test(first[2])
      const items: { text: string; checked: boolean | null; children: Block[] }[] = []
      while (i < lines.length) {
        const m = LIST_RE.exec(lines[i])
        if (!m || indentOf(lines[i]) !== base || /\d/.test(m[2]) !== ordered) break
        let text = m[3]
        let checked: boolean | null = null
        const task = /^\[([ xX])\]\s+(.*)$/.exec(text)
        if (task) {
          checked = task[1] !== " "
          text = task[2]
        }
        i++
        // linhas seguintes mais recuadas (sublista ou continuação) pertencem ao item
        const inner: string[] = []
        while (i < lines.length) {
          const l = lines[i]
          if (!l.trim()) {
            const nextIdx = i + 1
            if (nextIdx < lines.length && lines[nextIdx].trim() && indentOf(lines[nextIdx]) > base) {
              inner.push("")
              i++
              continue
            }
            break
          }
          if (indentOf(l) > base) {
            inner.push(l.slice(Math.min(indentOf(l), base + 2)))
            i++
            continue
          }
          if (!isBlockStart(l, lines[i + 1]) && inner.length === 0) {
            // continuação preguiçosa do texto do item
            text += " " + l.trim()
            i++
            continue
          }
          break
        }
        items.push({ text, checked, children: inner.length ? parseBlocks(inner.join("\n")) : [] })
        // item separado por linha em branco continua a mesma lista
        if (i < lines.length && !lines[i].trim()) {
          const nextIdx = i + 1
          const nm = nextIdx < lines.length ? LIST_RE.exec(lines[nextIdx]) : null
          if (nm && indentOf(lines[nextIdx]) === base && /\d/.test(nm[2]) === ordered) i++
        }
      }
      blocks.push({ type: "list", ordered, start: ordered ? parseInt(first[2], 10) || 1 : 1, items })
      continue
    }

    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !(para.length > 0 && isBlockStart(lines[i], lines[i + 1]))) {
      para.push(lines[i].trim())
      i++
    }
    blocks.push({ type: "p", lines: para })
  }
  return blocks
}

/* ── Inline ─────────────────────────────────────────────── */

type Inline =
  | { t: "text"; v: string }
  | { t: "b" | "i" | "s"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "a"; href: string; c: Inline[] }

function safeHref(url: string) {
  const u = url.trim()
  if (/^https?:\/\//i.test(u) || /^mailto:/i.test(u)) return u
  if (u.startsWith("/") && !u.startsWith("//")) return u
  return null
}

const INLINE_RE =
  /`([^`\n]+)`|\*\*(?=\S)([\s\S]+?)\*\*|__(?=\S)([\s\S]+?)__|~~(?=\S)([\s\S]+?)~~|\*(?=[^\s*])([^*\n]+?)\*|(?<![\p{L}\d_])_(?=\S)([^_\n]+?)_(?![\p{L}\d_])|\[([^\]\n]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?"'])/gu

function parseInline(src: string): Inline[] {
  const out: Inline[] = []
  let last = 0
  for (const m of src.matchAll(INLINE_RE)) {
    const idx = m.index ?? 0
    if (idx > last) out.push({ t: "text", v: src.slice(last, idx) })
    if (m[1] !== undefined) out.push({ t: "code", v: m[1] })
    else if (m[2] !== undefined || m[3] !== undefined) out.push({ t: "b", c: parseInline(m[2] ?? m[3]) })
    else if (m[4] !== undefined) out.push({ t: "s", c: parseInline(m[4]) })
    else if (m[5] !== undefined || m[6] !== undefined) out.push({ t: "i", c: parseInline(m[5] ?? m[6]) })
    else if (m[7] !== undefined) {
      const href = safeHref(m[8])
      if (href) out.push({ t: "a", href, c: parseInline(m[7]) })
      else out.push({ t: "text", v: m[7] })
    } else if (m[9] !== undefined) out.push({ t: "a", href: m[9], c: [{ t: "text", v: m[9] }] })
    last = idx + m[0].length
  }
  if (last < src.length) out.push({ t: "text", v: src.slice(last) })
  return out
}

/* Em streaming, marcadores ainda abertos ("**negr") não aparecem crus. */
function tidyStreaming(text: string) {
  let t = text
  const fences = (t.match(/^\s{0,3}(```|~~~)/gm) ?? []).length
  if (fences % 2 === 1) return t // dentro de bloco de código: deixa como está
  const lastLine = t.slice(t.lastIndexOf("\n") + 1)
  if ((lastLine.match(/\*\*/g) ?? []).length % 2 === 1) t = t.replace(/\*\*(?![\s\S]*\*\*)/, "")
  if ((lastLine.match(/`/g) ?? []).length % 2 === 1) t = t.replace(/`(?![\s\S]*`)/, "")
  return t
}

/* ── Render ─────────────────────────────────────────────── */

const StreamCtx = createContext(false)

function Words({ text }: { text: string }) {
  const streaming = useContext(StreamCtx)
  if (!streaming) return <>{text}</>
  const parts = text.split(/(\s+)/)
  return (
    <>
      {parts.map((part, i) =>
        /^\s*$/.test(part) ? (
          <Fragment key={i}>{part}</Fragment>
        ) : (
          <span key={i} style={{ animation: "fade-in var(--stream-fade) var(--stream-ease) both" }}>
            {part}
          </span>
        )
      )}
    </>
  )
}

function InlineNodes({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case "text":
            return <Words key={i} text={n.v} />
          case "code":
            return <code key={i}>{n.v}</code>
          case "b":
            return (
              <strong key={i}>
                <InlineNodes nodes={n.c} />
              </strong>
            )
          case "i":
            return (
              <em key={i}>
                <InlineNodes nodes={n.c} />
              </em>
            )
          case "s":
            return (
              <s key={i}>
                <InlineNodes nodes={n.c} />
              </s>
            )
          case "a":
            return (
              <a key={i} href={n.href} target={n.href.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer nofollow">
                <InlineNodes nodes={n.c} />
              </a>
            )
        }
      })}
    </>
  )
}

function InlineText({ text }: { text: string }) {
  const nodes = useMemo(() => parseInline(text), [text])
  return <InlineNodes nodes={nodes} />
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h": {
            const Tag = b.level === 2 ? "h2" : "h3"
            return (
              <Tag key={i}>
                <InlineText text={b.text} />
              </Tag>
            )
          }
          case "p":
            return (
              <p key={i}>
                {b.lines.map((l, j) => (
                  <Fragment key={j}>
                    {j > 0 && <br />}
                    <InlineText text={l} />
                  </Fragment>
                ))}
              </p>
            )
          case "list": {
            const Tag = b.ordered ? "ol" : "ul"
            const task = b.items.some((it) => it.checked !== null)
            return (
              <Tag key={i} start={b.ordered && b.start !== 1 ? b.start : undefined} className={cn(task && "list-none! pl-1!")}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    {it.checked !== null && (
                      <span
                        aria-hidden
                        className={cn(
                          "mr-2 inline-flex size-4 translate-y-[3px] items-center justify-center rounded-[4px] border border-line-strong align-top text-[11px] leading-none",
                          it.checked && "border-ink bg-ink text-ink-inverse"
                        )}
                      >
                        {it.checked ? "✓" : ""}
                      </span>
                    )}
                    {it.checked !== null && <span className="sr-only">{it.checked ? "Feito: " : "A fazer: "}</span>}
                    <InlineText text={it.text} />
                    {it.children.length > 0 && <Blocks blocks={it.children} />}
                  </li>
                ))}
              </Tag>
            )
          }
          case "quote":
            return (
              <blockquote key={i}>
                <Blocks blocks={b.children} />
              </blockquote>
            )
          case "hr":
            return <hr key={i} />
          case "code":
            return <CodeBlock key={i} code={b.code} language={b.lang} />
          case "table":
            return (
              <div key={i} className="-mx-1 overflow-x-auto px-1">
                <table>
                  <thead>
                    <tr>
                      {b.header.map((h, j) => (
                        <th key={j}>
                          <InlineText text={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>
                        {r.map((c, k) => (
                          <td key={k}>
                            <InlineText text={c} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      })}
    </>
  )
}

export function Markdown({ text, streaming = false, className }: { text: string; streaming?: boolean; className?: string }) {
  const source = streaming ? tidyStreaming(text) : text
  const blocks = useMemo(() => parseBlocks(source), [source])
  return (
    <StreamCtx.Provider value={streaming}>
      <div className={cn("prose-chat", className)}>
        <Blocks blocks={blocks} />
      </div>
    </StreamCtx.Provider>
  )
}

/*
 * Revela o texto que chega em rajadas num ritmo contínuo: a fila
 * nunca demora mais que ~0,5 s para zerar, e sempre para no fim de
 * uma palavra. Quando o streaming termina, continua até alcançar.
 */
export function useSmoothText(target: string, enabled: boolean) {
  const [shown, setShown] = useState(enabled ? 0 : target.length)
  const shownRef = useRef(shown)
  const targetRef = useRef(target)

  useEffect(() => {
    targetRef.current = target
    if (!enabled) return
    let raf = 0
    const tick = () => {
      const goal = targetRef.current.length
      const current = shownRef.current
      if (current > goal) {
        // o texto recomeçou (nova tentativa)
        shownRef.current = goal
        setShown(goal)
        return
      }
      if (current >= goal) return
      const backlog = goal - current
      let next = Math.min(goal, current + Math.max(2, Math.ceil(backlog / 30)))
      const space = targetRef.current.slice(next).search(/\s/)
      next = space === -1 ? goal : Math.min(goal, next + space)
      shownRef.current = next
      setShown(next)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, enabled])

  if (!enabled) return target
  return target.slice(0, shown)
}

/* Texto puro para copiar: tira a marcação mais comum. */
export function markdownToPlain(text: string) {
  return text
    .replace(/```[\w+-]*\n?/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
}
