/*
 * CSV para abrir direto no Excel em português: separador ";",
 * BOM UTF-8 (acentos corretos) e quebras de linha CRLF.
 */

type Cell = string | number | boolean | null | undefined

function escapeCell(value: Cell) {
  if (value === null || value === undefined) return ""
  let text = String(value)
  // evita que o Excel interprete texto como fórmula (números passam direto)
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  if (/[";\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCsv(header: string[], rows: Cell[][]) {
  const lines = [header, ...rows].map((row) => row.map(escapeCell).join(";"))
  return "\uFEFF" + lines.join("\r\n") + "\r\n"
}

export function csvResponse(filename: string, body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
