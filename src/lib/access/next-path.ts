/*
 * Destino depois do login ou do link do e-mail (?next=).
 * Só aceita caminho relativo do próprio app: nada de "//site.com",
 * "https://..." ou barra invertida (open redirect).
 */
const BASE = "http://app.invalid"
const LOOP_PREFIXES = ["/login", "/auth", "/api"]

export function safeNextPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback
  const raw = value.trim()
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback
  // barra invertida e caracteres de controle viram "//" em alguns navegadores
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return fallback

  let url: URL
  try {
    url = new URL(raw, BASE)
  } catch {
    return fallback
  }
  if (url.origin !== BASE) return fallback
  if (LOOP_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) return fallback

  return `${url.pathname}${url.search}${url.hash}`
}
