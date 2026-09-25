import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/types"

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]

/* Usuário logado + perfil, uma vez por requisição. */
export const getSession = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile) return null
  return { user, profile }
})

/* Páginas do app: exige login e acesso ativo. */
export async function requireUser() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.profile.status !== "active") redirect("/bloqueado")
  return session
}

/* Páginas e APIs do admin: exige papel admin ativo. */
export async function requireAdmin() {
  const session = await requireUser()
  if (session.profile.role !== "admin") redirect("/")
  return session
}

/* Versão para rotas de API: devolve null em vez de redirecionar. */
export async function getActiveUser() {
  const session = await getSession()
  if (!session || session.profile.status !== "active") return null
  return session
}
