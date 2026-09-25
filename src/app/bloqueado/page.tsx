import type { Metadata } from "next"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { AuthShell } from "@/app/(auth)/_components/auth-shell"
import { withBase } from "@/lib/base-path"
import { appConfig } from "@/config/app.config"

export const metadata: Metadata = { title: "Acesso bloqueado" }

export default async function BlockedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <AuthShell title="Seu acesso está bloqueado">
      <div className="flex flex-col gap-4 text-body text-ink-2">
        <p>
          Isso acontece quando a compra foi reembolsada ou cancelada, ou quando o acesso foi bloqueado pela equipe.
        </p>
        <p>
          Se você acha que é um engano, fale com o suporte pelo mesmo canal em que fez a compra e informe o e-mail
          {user?.email ? (
            <>
              {" "}
              <span className="font-medium text-ink">{user.email}</span>
            </>
          ) : (
            " da sua conta"
          )}
          .
        </p>
        {appConfig.supportEmail && (
          <p>
            Suporte:{" "}
            <a href={`mailto:${appConfig.supportEmail}`} className="font-medium text-ink underline underline-offset-4">
              {appConfig.supportEmail}
            </a>
          </p>
        )}
      </div>

      <div className="mt-8">
        {user ? (
          <form action={withBase("/auth/sair")} method="post">
            <Button type="submit" variant="secondary" size="lg" className="w-full">
              Sair
            </Button>
          </form>
        ) : (
          <Link
            href="/login"
            className={buttonVariants({ variant: "secondary", size: "lg", className: "w-full" })}
          >
            Voltar para o login
          </Link>
        )}
      </div>
    </AuthShell>
  )
}
