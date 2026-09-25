import type { Metadata } from "next"
import { AuthShell } from "../_components/auth-shell"
import { ForgotForm } from "./forgot-form"

export const metadata: Metadata = { title: "Esqueci minha senha" }

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Esqueci minha senha"
      description="Digite o e-mail da sua compra. Vamos mandar um link para você criar uma nova senha."
    >
      <ForgotForm />
    </AuthShell>
  )
}
