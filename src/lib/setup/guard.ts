import "server-only"
import { createClient } from "@supabase/supabase-js"

/*
 * O assistente /setup só existe enquanto é útil:
 *  - sempre em desenvolvimento (npm run dev);
 *  - em produção, só enquanto ainda não existe nenhum admin.
 * Ele nunca mostra valores de variáveis, só se existem e se funcionam.
 */
export async function setupAllowed() {
  if (process.env.NODE_ENV !== "production") return true
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return true
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const { count, error } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin")
    if (error) return true
    return (count ?? 0) === 0
  } catch {
    return true
  }
}
