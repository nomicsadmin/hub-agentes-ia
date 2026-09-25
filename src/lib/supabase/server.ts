import "server-only"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { publicEnv } from "@/lib/env.public"
import { serverEnv } from "@/lib/env.server"
import type { Database } from "./types"

/* Cliente do servidor com a sessão do usuário (cookies): respeita o RLS. */
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // chamado de um Server Component: o proxy renova a sessão
        }
      },
    },
  })
}

/*
 * Cliente com a service role: ignora o RLS. Só no servidor, só para o
 * que o usuário não pode ler direto (prompt, documentos, métricas, webhook).
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(publicEnv.supabaseUrl, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
