/* Regras de upload dos documentos da base (navegador e servidor). */

export const DOC_EXTENSIONS = [".pdf", ".docx", ".md", ".txt"] as const
export const DOC_ACCEPT = ".pdf,.docx,.md,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,text/plain"
export const DOC_MAX_BYTES = 50 * 1024 * 1024 // limite do bucket knowledge

export function docExtension(filename: string) {
  const lower = filename.toLowerCase()
  return DOC_EXTENSIONS.find((ext) => lower.endsWith(ext)) ?? null
}

export function docMime(filename: string, fallback?: string) {
  switch (docExtension(filename)) {
    case ".pdf":
      return "application/pdf"
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    case ".md":
      return "text/markdown"
    case ".txt":
      return "text/plain"
    default:
      return fallback || "application/octet-stream"
  }
}

/* Nome seguro para o caminho no Storage. */
export function safeFileName(filename: string) {
  const ext = docExtension(filename) ?? ""
  const base = filename
    .slice(0, filename.length - ext.length)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
  return `${base || "documento"}${ext}`
}

export function titleFromFileName(filename: string) {
  const ext = docExtension(filename) ?? ""
  return filename.slice(0, filename.length - ext.length).replace(/[-_]+/g, " ").trim() || filename
}
