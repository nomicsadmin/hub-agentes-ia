"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { publicEnv } from "@/lib/env.public"

export type ForgotState = { sent?: boolean; email?: string; error?: string }

const emailSchema = z
  .string()
  .trim()
  .min(1, "Digite seu e-mail.")
  .pipe(z.email("Confira o e-mail. Use o formato nome@exemplo.com."))

export async function requestPasswordReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const input = String(formData.get("email") ?? "")
  const parsed = emailSchema.safeParse(input)
  if (!parsed.success) return { email: input, error: parsed.error.issues[0]?.message }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.toLowerCase(), {
    redirectTo: `${publicEnv.siteUrl}/auth/confirm?next=/definir-senha`,
  })
  // a resposta é sempre a mesma: não revela se o e-mail tem acesso
  if (error) console.error("[esqueci-senha] falha ao enviar:", error.code ?? error.message)

  return { sent: true }
}
