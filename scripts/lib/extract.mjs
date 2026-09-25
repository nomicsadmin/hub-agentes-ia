/*
 * Extração de texto (mesma lógica de src/lib/knowledge/extract.ts):
 * PDF com marcação [página N], DOCX via mammoth, MD/TXT como texto puro.
 */
import { extractText as extractPdf, getDocumentProxy } from "unpdf"

export const MIME_BY_EXT = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".md": "text/markdown",
  ".txt": "text/plain",
}

export async function extractText(buffer, mime) {
  if (mime === "application/pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const { text } = await extractPdf(pdf, { mergePages: false })
    return (Array.isArray(text) ? text : [text])
      .map((page, i) => `\n\n[página ${i + 1}]\n${page.trim()}`)
      .join("")
      .trim()
  }
  if (mime.includes("wordprocessingml")) {
    const { default: mammoth } = await import("mammoth")
    const { value } = await mammoth.extractRawText({ buffer })
    return value.trim()
  }
  return buffer.toString("utf8").trim()
}

export const estimateTokens = (text) => Math.ceil(text.length / 4)
