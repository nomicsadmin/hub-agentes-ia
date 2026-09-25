import "server-only"
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer"
import { parseMarkdown, sanitizeForPdf, type Block, type Inline } from "./markdown"
import { appConfig } from "@/config/app.config"

/*
 * PDF com o visual Grafite do design system: Helvetica, tinta #0d0d0d,
 * cinza #5d5d5d, linhas #e6e6e6. nome do app (app.config.ts) no topo e data no rodapé.
 * Usado pela ferramenta gerar_pdf e pelo botão "Baixar em PDF".
 */

const INK = "#0d0d0d"
const INK_2 = "#5d5d5d"
const INK_4 = "#8f8f8f"
const EDGE = "#e6e6e6"
const BUBBLE = "#f4f4f4"
const A4_HEIGHT = 841.89

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.55,
    color: INK,
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 52,
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    marginBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: EDGE,
  },
  brand: { fontFamily: "Helvetica", fontWeight: "bold", fontSize: 12, letterSpacing: 0.4 },
  brandMeta: { fontSize: 9, color: INK_2 },
  title: { fontFamily: "Helvetica", fontWeight: "bold", fontSize: 20, lineHeight: 1.3, marginBottom: 6 },
  subtitle: { fontSize: 10, color: INK_2, marginBottom: 18 },
  h1: { fontFamily: "Helvetica", fontWeight: "bold", fontSize: 16, lineHeight: 1.35, marginTop: 14, marginBottom: 6 },
  h2: { fontFamily: "Helvetica", fontWeight: "bold", fontSize: 13.5, lineHeight: 1.4, marginTop: 12, marginBottom: 5 },
  h3: { fontFamily: "Helvetica", fontWeight: "bold", fontSize: 12, lineHeight: 1.45, marginTop: 10, marginBottom: 4 },
  paragraph: { marginBottom: 8 },
  list: { marginBottom: 8 },
  item: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 16, color: INK_2 },
  number: { width: 20, color: INK_2 },
  box: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: INK_2,
    borderRadius: 1.5,
    marginTop: 3.5,
    marginRight: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  boxMark: { fontFamily: "Helvetica", fontWeight: "bold", fontSize: 7, lineHeight: 1, color: INK },
  itemText: { flex: 1 },
  quote: { borderLeftWidth: 2, borderLeftColor: EDGE, paddingLeft: 10, color: INK_2, marginBottom: 8 },
  hr: { borderBottomWidth: 1, borderBottomColor: EDGE, marginVertical: 10 },
  code: {
    fontFamily: "Courier",
    fontSize: 9.5,
    backgroundColor: BUBBLE,
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  table: { borderWidth: 1, borderColor: EDGE, borderRadius: 4, marginBottom: 10 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: EDGE },
  trLast: { flexDirection: "row" },
  th: { flex: 1, padding: 5, fontFamily: "Helvetica", fontWeight: "bold", fontSize: 9.5, backgroundColor: BUBBLE },
  td: { flex: 1, padding: 5, fontSize: 9.5 },
  // "top" em vez de "bottom": com lineHeight na página, o react-pdf some com rodapé ancorado em bottom
  footer: {
    position: "absolute",
    top: A4_HEIGHT - 52,
    left: 52,
    right: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8.5,
    color: INK_4,
    borderTopWidth: 1,
    borderTopColor: EDGE,
    paddingTop: 8,
  },
  bold: { fontFamily: "Helvetica", fontWeight: "bold" },
  italic: { fontStyle: "italic" },
  inlineCode: { fontFamily: "Courier" },
})

function Spans({ inline }: { inline: Inline[] }) {
  return (
    <>
      {inline.map((seg, i) => (
        <Text key={i} style={seg.bold ? s.bold : seg.italic ? s.italic : seg.code ? s.inlineCode : undefined}>
          {seg.text}
        </Text>
      ))}
    </>
  )
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return (
        <Text style={block.level === 1 ? s.h1 : block.level === 2 ? s.h2 : s.h3} minPresenceAhead={40}>
          <Spans inline={block.inline} />
        </Text>
      )
    case "paragraph":
      return (
        <Text style={s.paragraph}>
          <Spans inline={block.inline} />
        </Text>
      )
    case "quote":
      return (
        <Text style={s.quote}>
          <Spans inline={block.inline} />
        </Text>
      )
    case "hr":
      return <View style={s.hr} />
    case "code":
      return <Text style={s.code}>{block.text}</Text>
    case "list":
      return (
        <View style={s.list}>
          {block.items.map((item, i) => (
            <View key={i} style={[s.item, { paddingLeft: item.depth * 14 }]} wrap={false}>
              {item.checked !== null ? (
                <View style={s.box}>{item.checked ? <Text style={s.boxMark}>x</Text> : null}</View>
              ) : (
                <Text style={item.marker === "•" ? s.bullet : s.number}>{item.marker}</Text>
              )}
              <Text style={s.itemText}>
                <Spans inline={item.inline} />
              </Text>
            </View>
          ))}
        </View>
      )
    case "table":
      return (
        <View style={s.table}>
          <View style={s.tr} wrap={false}>
            {block.header.map((cell, i) => (
              <Text key={i} style={s.th}>
                <Spans inline={cell} />
              </Text>
            ))}
          </View>
          {block.rows.map((row, r) => (
            <View key={r} style={r === block.rows.length - 1 ? s.trLast : s.tr} wrap={false}>
              {block.header.map((_, c) => (
                <Text key={c} style={s.td}>
                  <Spans inline={row[c] ?? []} />
                </Text>
              ))}
            </View>
          ))}
        </View>
      )
  }
}

export function formatDateBR(date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: appConfig.timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

export type PdfInput = {
  title: string
  markdown: string
  /** linha sob o título, ex.: nome do agente */
  subtitle?: string
  date?: Date
}

export async function renderMarkdownPdf({ title, markdown, subtitle, date = new Date() }: PdfInput): Promise<Buffer> {
  const cleanTitle = sanitizeForPdf(title).trim() || "Documento"
  const blocks = parseMarkdown(markdown)
  // se o conteúdo começa repetindo o título, não duplica
  if (blocks[0]?.type === "heading" && blocks[0].inline.map((i) => i.text).join("").trim() === cleanTitle) {
    blocks.shift()
  }
  const dateLabel = formatDateBR(date)

  return renderToBuffer(
    <Document title={cleanTitle} author={appConfig.name} creator={appConfig.name} producer={appConfig.name} language={appConfig.locale}>
      <Page size="A4" style={s.page}>
        <View style={s.footer} fixed>
          <Text>{appConfig.name} · {dateLabel}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} de ${totalPages}`} />
        </View>
        <View style={s.brandRow} fixed>
          <Text style={s.brand}>{appConfig.name}</Text>
          <Text style={s.brandMeta}>{subtitle ? sanitizeForPdf(subtitle) : ""}</Text>
        </View>
        <Text style={s.title}>{cleanTitle}</Text>
        <Text style={s.subtitle}>Gerado em {dateLabel}</Text>
        {blocks.map((block, i) => (
          <BlockView key={i} block={block} />
        ))}
      </Page>
    </Document>
  )
}

/* Nome de arquivo seguro a partir de um título: "checklist-da-semana.pdf". */
export function pdfFileName(title: string) {
  const base = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
  return `${base || "documento"}.pdf`
}
