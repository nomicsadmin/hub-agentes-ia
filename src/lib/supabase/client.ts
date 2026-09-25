import { createBrowserClient } from "@supabase/ssr"
import { publicEnv } from "@/lib/env.public"
import type { Database } from "./types"

/* Cliente do navegador: só a chave pública; respeita o RLS do usuário logada. */
export function createClient() {
  return createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey)
}
