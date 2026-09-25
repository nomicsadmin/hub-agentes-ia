import type { Metadata } from "next"
import Link from "next/link"
import { safeNextPath } from "@/lib/access/next-path"
import { AuthShell } from "../_components/auth-shell"
import { LoginForm } from "./login-form"

export const metadata: Metadata = { title: "Entrar" }

const NOTICES: Record<string, string> = {
  "link-invalido": "Este link expirou ou já foi usado. Peça um novo em Esqueci minha senha.",
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const erro = typeof params.erro === "string" ? params.erro : undefined
  const rawNext = typeof params.next === "string" ? params.next : undefined
  const next = rawNext ? safeNextPath(rawNext) : undefined

  return (
    <AuthShell title="Entre na sua conta" description="Use o e-mail da sua compra e a senha que você criou.">
      <LoginForm next={next && next !== "/" ? next : undefined} notice={erro ? NOTICES[erro] : undefined} />
      {process.env.NODE_ENV !== "production" && (
        <p className="mt-6 text-meta text-ink-3">
          Instalando agora?{" "}
          <Link href="/setup" className="text-ink underline underline-offset-4">
            Abra o assistente de instalação
          </Link>
          .
        </p>
      )}
    </AuthShell>
  )
}
