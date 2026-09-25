import "server-only"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"

/*
 * Checagem de admin para server actions e rotas de API.
 * Páginas usam requireAdmin() (redireciona); aqui não há redirect:
 * a action devolve erro e a rota responde 403.
 */

export type AdminSession = NonNullable<Awaited<ReturnType<typeof getSession>>>

export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await getSession()
  if (!session) return null
  if (session.profile.status !== "active" || session.profile.role !== "admin") return null
  return session
}

/* Para rotas de API: devolve a sessão ou a resposta 401/403 pronta. */
export async function adminRouteGuard(): Promise<{ session: AdminSession } | { response: NextResponse }> {
  const session = await getSession()
  if (!session) {
    return { response: NextResponse.json({ error: "Faça login para continuar." }, { status: 401 }) }
  }
  if (session.profile.status !== "active" || session.profile.role !== "admin") {
    return { response: NextResponse.json({ error: "Acesso restrito ao admin." }, { status: 403 }) }
  }
  return { session }
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}
