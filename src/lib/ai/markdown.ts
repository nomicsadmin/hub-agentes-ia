/*
 * Markdown simples → blocos, para montar o PDF.
 * Cobre o que o agente escreve: títulos, parágrafos, listas (com
 * checklist "- [ ]"), citações, linha divisória, tabelas e código.
 */

export type Inline = { text: string; bold?: boolean; italic?: boolean; code?: boolean }

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; inline: Inline[] }
  | { type: "paragraph"; inline: Inline[] }
  | { type: "list"; items: ListItem[] }
  | { type: "quote"; inline: Inline[] }
  | { type: "hr" }
  | { type: "table"; header: Inline[][]; rows: Inline[][][] }
  | { type: "code"; text: string }

export type ListItem = { inline: Inline[]; depth: number; marker: string; checked: boolean | null }

/* Helvetica padrão do PDF só tem o conjunto WinAnsi: troca ou remove o resto (emojis etc.). */
const REPLACEMENTS: Record<string, string> = {
  "→": "->",
  "←": "<-",
  "⇒": "=>",
  "≈": "~",
  "≤": "<=",
  "≥": ">=",
  "✓": "x",
  "✔": "x",
  "✅": "",
  "❌": "",
  "☐": "[ ]",
  "☑": "[x]",
  "\u00a0": " ",
}
const WIN_ANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ"

export function sanitizeForPdf(text: string) {
  let out = ""
  for (const ch of text) {
    if (ch in REPLACEMENTS) out += REPLACEMENTS[ch]
    else if (ch === "\n" || ch === "\t" || (ch >= " " && ch <= "\u00ff") || WIN_ANSI_EXTRA.includes(ch)) out += ch
  }
  return out.replace(/[ \t]+\n/g, "\n")
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = []
  // links viram só o texto; imagens somem
  const src = text.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
  const re = /(\*\*|__)(.+?)\1|`([^`]+)`|\*(?!\s)(.+?)\*/g
  let last = 0
  for (const m of src.matchAll(re)) {
    const idx = m.index ?? 0
    if (idx > last) out.push({ text: src.slice(last, idx) })
    if (m[2] !== undefined) out.push({ text: m[2], bold: true })
    else if (m[3] !== undefined) out.push({ text: m[3], code: true })
    else if (m[4] !== undefined) out.push({ text: m[4], italic: true })
    last = idx + m[0].length
  }
  if (last < src.length) out.push({ text: src.slice(last) })
  return out.filter((s) => s.text.length > 0)
}

const splitRow = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim())

export function parseMarkdown(markdown: string): Block[] {
  const lines = sanitizeForPdf(markdown).replace(/\r\n/g, "\n").split("\n")
  const blocks: Block[] = []
  let para: string[] = []

  const flushPara = () => {
    if (para.length) blocks.push({ type: "paragraph", inline: parseInline(para.join(" ").trim()) })
    para = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      flushPara()
      continue
    }

    // bloco de código
    if (trimmed.startsWith("```")) {
      flushPara()
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith("```")) body.push(lines[i++])
      blocks.push({ type: "code", text: body.join("\n") })
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed)
    if (heading) {
      flushPara()
      const level = Math.min(heading[1].length, 3) as 1 | 2 | 3
      blocks.push({ type: "heading", level, inline: parseInline(heading[2].replace(/#+$/, "").trim()) })
      continue
    }

    if (/^([-*_])(\s*\1){2,}$/.test(trimmed)) {
      flushPara()
      blocks.push({ type: "hr" })
      continue
    }

    // tabela: linha com | seguida de separador |---|
    if (trimmed.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
      flushPara()
      const header = splitRow(trimmed).map(parseInline)
      const rows: Inline[][][] = []
      i += 2
      while (i < lines.length && lines[i].trim().includes("|")) rows.push(splitRow(lines[i++]).map(parseInline))
      i--
      blocks.push({ type: "table", header, rows })
      continue
    }

    if (trimmed.startsWith(">")) {
      flushPara()
      const body: string[] = []
      while (i < lines.length && lines[i].trim().startsWith(">")) body.push(lines[i++].trim().replace(/^>\s?/, ""))
      i--
      blocks.push({ type: "quote", inline: parseInline(body.join(" ")) })
      continue
    }

    const item = /^(\s*)([-*+•]|\d+[.)])\s+(.*)$/.exec(line)
    if (item) {
      flushPara()
      const items: ListItem[] = []
      while (i < lines.length) {
        const m = /^(\s*)([-*+•]|\d+[.)])\s+(.*)$/.exec(lines[i])
        if (!m) {
          // continuação da linha do item anterior (texto recuado)
          if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) {
            items[items.length - 1].inline.push({ text: " " + lines[i].trim() })
            i++
            continue
          }
          break
        }
        const depth = Math.min(Math.floor(m[1].replace(/\t/g, "  ").length / 2), 3)
        let body = m[3]
        let checked: boolean | null = null
        const box = /^\[( |x|X)\]\s*(.*)$/.exec(body)
        if (box) {
          checked = box[1].toLowerCase() === "x"
          body = box[2]
        }
        const marker = /\d/.test(m[2]) ? m[2].replace(")", ".") : "•"
        items.push({ inline: parseInline(body), depth, marker, checked })
        i++
      }
      i--
      blocks.push({ type: "list", items })
      continue
    }

    para.push(trimmed)
  }
  flushPara()
  return blocks
}
