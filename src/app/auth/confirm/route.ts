import type { NextRequest } from "next/server"
import { relativeRedirect } from "@/lib/redirect"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { safeNextPath } from "@/lib/access/next-path"

/*
 * Destino dos links dos e-mails do Supabase (convite e recuperação):
 * {{SiteURL}}/auth/confirm?token_hash=...&type=invite|recovery&next=/definir-senha
 * Troca o token por uma sessão (cookies) e segue para o próximo passo.
 */

const ALLOWED_TYPES = new Set<EmailOtpType>(["invite", "recovery", "email", "magiclink"])

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const tokenHash = params.get("token_hash")
  const type = params.get("type") as EmailOtpType | null
  const next = safeNextPath(params.get("next"))

  if (tokenHash && type && ALLOWED_TYPES.has(type)) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      return relativeRedirect(next, 303)
    }
    console.error("[auth/confirm] link recusado:", error.code ?? error.message)
  }

  return relativeRedirect("/login?erro=link-invalido", 303)
}
