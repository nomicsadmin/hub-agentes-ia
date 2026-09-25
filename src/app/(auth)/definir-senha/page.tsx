import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AuthShell } from "../_components/auth-shell"
import { SetPasswordForm } from "./set-password-form"

export const metadata: Metadata = { title: "Criar senha" }

/* Chega aqui pelo link do convite ou da recuperação (a sessão vem de /auth/confirm). */
export default async function SetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?erro=link-invalido")

  return (
    <AuthShell
      title="Crie sua senha"
      description={
        <>
          Você vai usar esta senha para entrar com <span className="font-medium text-ink">{user.email}</span>.
        </>
      }
    >
      <SetPasswordForm email={user.email} />
    </AuthShell>
  )
}
