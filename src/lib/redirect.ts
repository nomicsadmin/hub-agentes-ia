import { NextResponse } from "next/server"
import { withBase } from "@/lib/base-path"

/*
 * Redirecionamento relativo ("Location: /login").
 * Se o app estiver atrás de um proxy ou Multi-Zones, uma URL absoluta
 * montada a partir da requisição poderia apontar para o domínio interno.
 * Relativa, o navegador resolve no mesmo domínio que a pessoa está usando.
 */
export function relativeRedirect(path: string, status: 303 | 307 = 307, carryCookiesFrom?: NextResponse) {
  const res = new NextResponse(null, { status, headers: { Location: withBase(path) } })
  carryCookiesFrom?.cookies.getAll().forEach((c) => res.cookies.set(c))
  return res
}

/*
 * No proxy o Next exige URL absoluta. Usa a origem oficial do site
 * (NEXT_PUBLIC_SITE_URL), nunca a da requisição: em produção é sempre o
 * domínio público, mesmo quando o pedido chega por um domínio interno.
 */
export function siteRedirect(path: string, status: 303 | 307 = 307, carryCookiesFrom?: NextResponse) {
  const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").origin
  const res = NextResponse.redirect(new URL(withBase(path), origin), status)
  carryCookiesFrom?.cookies.getAll().forEach((c) => res.cookies.set(c))
  return res
}
