import "server-only"
import { createAdminClient } from "@/lib/supabase/server"

/*
 * Registra a entrada do usuário (evento 'login', last_seen_at e
 * access_count) e devolve o status do perfil. Só chamar depois que o
 * Supabase confirmou a sessão da próprio usuário.
 */
export async function registerLogin(userId: string): Promise<"active" | "blocked" | "missing"> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("status, access_count")
    .eq("id", userId)
    .maybeSingle()

  if (!profile) return "missing"
  if (profile.status !== "active") return "blocked"

  const [event, update] = await Promise.all([
    admin.from("usage_events").insert({ user_id: userId, kind: "login" }),
    admin
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString(), access_count: profile.access_count + 1 })
      .eq("id", userId),
  ])
  // métrica não pode impedir a entrada
  if (event.error) console.error("[login] evento não gravado:", event.error.message)
  if (update.error) console.error("[login] perfil não atualizado:", update.error.message)

  return "active"
}
