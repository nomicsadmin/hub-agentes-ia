import "server-only"
import { extractText as extractPdf, getDocumentProxy } from "unpdf"
import mammoth from "mammoth"

/* Converte PDF, DOCX, MD ou TXT em texto puro para a base do agente. */
export async function extractText(buffer: Buffer, mime: string, filename: string): Promise<string> {
  const name = filename.toLowerCase()
  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const { text } = await extractPdf(pdf, { mergePages: false })
    return (Array.isArray(text) ? text : [text])
      .map((page, i) => `\n\n[página ${i + 1}]\n${page.trim()}`)
      .join("")
      .trim()
  }
  if (mime.includes("officedocument.wordprocessingml") || name.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer })
    return value.trim()
  }
  if (mime.startsWith("text/") || name.endsWith(".md") || name.endsWith(".txt")) {
    return buffer.toString("utf8").trim()
  }
  throw new Error("Formato não suportado. Envie PDF, DOCX, MD ou TXT.")
}

/* Estimativa simples: ~4 caracteres por token em português. */
export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4)
}

/* Acima disso a base deixa de ir inteira no prompt e passa a usar busca (RAG). */
export const FULL_CONTEXT_TOKEN_LIMIT = 80_000
