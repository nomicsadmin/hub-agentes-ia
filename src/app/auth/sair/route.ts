import { relativeRedirect } from "@/lib/redirect"
import { createClient } from "@/lib/supabase/server"

/* Sair: encerra a sessão e volta para o login. Só POST (um link GET poderia ser disparado por terceiros). */
export async function POST() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) console.error("[auth/sair] falha ao encerrar a sessão:", error.code ?? error.message)
  // 303: o navegador segue com GET para /login
  return relativeRedirect("/login", 303)
}
