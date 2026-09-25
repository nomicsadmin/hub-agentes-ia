/*
 * Divide o texto de um documento em trechos para a busca (RAG).
 * Arquivo puro (sem imports): usado pelo app e pelos scripts de
 * ingestão (o Node 24 roda .ts direto, removendo os tipos).
 *
 * Trechos de ~1.800 caracteres (~450 tokens), cortados em parágrafo
 * quando possível, com ~200 caracteres de sobreposição para não
 * perder o contexto na fronteira.
 */

export const CHUNK_SIZE = 1800
export const CHUNK_OVERLAP = 200

export function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
  if (!clean) return []
  if (clean.length <= size) return [clean]

  const chunks: string[] = []
  let start = 0
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length)
    if (end < clean.length) {
      // prefere cortar em parágrafo, depois em linha, depois em frase
      const window = clean.slice(start, end)
      const cut = Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf("\n"), window.lastIndexOf(". "))
      if (cut > size * 0.5) end = start + cut + 1
    }
    const piece = clean.slice(start, end).trim()
    if (piece) chunks.push(piece)
    if (end >= clean.length) break
    start = Math.max(end - overlap, start + 1)
  }
  return chunks
}
