"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { registerLogin } from "@/lib/access/login"

export type SetPasswordState = {
  error?: string
  fieldErrors?: { password?: string; confirm?: string }
}

/* Mesmas regras do Supabase (minimum_password_length 6, sem exigência de letras): pode ser só números. */
const schema = z
  .object({
    password: z
      .string()
      .min(6, "A senha precisa ter pelo menos 6 caracteres.")
      .max(72, "Use no máximo 72 caracteres."),
    confirm: z.string().min(1, "Repita a senha para confirmar."),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "As senhas não são iguais. Digite de novo." })

export async function setPassword(_prev: SetPasswordState, formData: FormData): Promise<SetPasswordState> {
  const parsed = schema.safeParse({
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  })
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors
    return { fieldErrors: { password: errors.password?.[0], confirm: errors.confirm?.[0] } }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Seu link expirou. Peça um novo em Esqueci minha senha." }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    return { error: updateErrorMessage(error.code) }
  }

  let status: Awaited<ReturnType<typeof registerLogin>> = "active"
  try {
    status = await registerLogin(user.id)
  } catch (err) {
    // a senha já foi trocada; a métrica não pode travar a entrada
    console.error("[definir-senha] falha ao registrar a entrada:", err instanceof Error ? err.message : err)
  }

  if (status === "blocked") {
    await supabase.auth.signOut()
    redirect("/bloqueado")
  }

  redirect("/")
}

function updateErrorMessage(code: string | undefined) {
  switch (code) {
    case "same_password":
      return "A nova senha precisa ser diferente da anterior."
    case "weak_password":
      return "Senha muito fácil de adivinhar. Evite sequências como 123456 e use pelo menos 6 caracteres."
    case "session_not_found":
    case "session_expired":
    case "reauthentication_needed":
      return "Seu link expirou. Peça um novo em Esqueci minha senha."
    default:
      return "Não foi possível salvar a senha agora. Tente de novo em instantes."
  }
}
