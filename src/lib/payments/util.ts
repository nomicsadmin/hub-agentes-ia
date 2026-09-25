import { createHash, timingSafeEqual } from "node:crypto"

/* Compara resumos de tamanho fixo: o tempo não depende do conteúdo nem do tamanho. */
export function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest()
  const hb = createHash("sha256").update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex")
}

export function csvList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}
