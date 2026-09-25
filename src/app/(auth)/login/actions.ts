"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { registerLogin } from "@/lib/access/login"
import { safeNextPath } from "@/lib/access/next-path"

export type LoginState = {
  email?: string
  error?: string
  fieldErrors?: { email?: string; password?: string }
}

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Digite seu e-mail.")
    .pipe(z.email("Confira o e-mail. Use o formato nome@exemplo.com.")),
  password: z.string().min(1, "Digite sua senha."),
})

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const emailInput = String(formData.get("email") ?? "")
  const parsed = schema.safeParse({ email: emailInput, password: formData.get("password") ?? "" })
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors
    return { email: emailInput, fieldErrors: { email: errors.email?.[0], password: errors.password?.[0] } }
  }

  const email = parsed.data.email.toLowerCase()
  const next = safeNextPath(formData.get("next"))
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password })
  if (error || !data.user) {
    return { email, error: loginErrorMessage(error?.code) }
  }

  let status: Awaited<ReturnType<typeof registerLogin>>
  try {
    status = await registerLogin(data.user.id)
  } catch (err) {
    console.error("[login] falha ao conferir o perfil:", err instanceof Error ? err.message : err)
    await supabase.auth.signOut()
    return { email, error: "Não foi possível entrar agora. Tente de novo em instantes." }
  }

  if (status === "missing") {
    await supabase.auth.signOut()
    return { email, error: "Não encontramos seu acesso. Fale com o suporte." }
  }
  if (status === "blocked") {
    await supabase.auth.signOut()
    redirect("/bloqueado")
  }

  redirect(next)
}

/* Nunca diz se o e-mail existe: senha errada e e-mail desconhecido dão a mesma resposta. */
function loginErrorMessage(code: string | undefined) {
  switch (code) {
    case "email_not_confirmed":
      return "Seu acesso ainda não foi ativado. Abra o link do e-mail de boas-vindas para criar sua senha."
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo."
    case "user_banned":
      return "Seu acesso está bloqueado. Fale com o suporte."
    case "invalid_credentials":
    case undefined:
      return "E-mail ou senha incorretos. Confira e tente de novo."
    default:
      return "Não foi possível entrar agora. Tente de novo em instantes."
  }
}
