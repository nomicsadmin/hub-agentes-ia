"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Field, TextField } from "../_components/fields"
import { requestPasswordReset, type ForgotState } from "./actions"

const backLinkClass =
  "inline-flex min-h-11 items-center justify-center text-ui text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink hover:decoration-ink"

export function ForgotForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(requestPasswordReset, {})

  if (state.sent) {
    return (
      <div className="flex flex-col gap-5">
        <p role="status" className="text-body text-ink">
          Se este e-mail tiver acesso, enviamos um link para criar uma nova senha. Confira a caixa de entrada e o
          spam. O link vale por 1 hora.
        </p>
        <Link href="/login" className={backLinkClass}>
          Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <Field id="email" label="E-mail" error={state.error}>
        <TextField
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state.email}
          key={state.email ?? "email"}
          error={state.error}
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviar link"}
      </Button>

      <Link href="/login" className={backLinkClass}>
        Voltar para o login
      </Link>
    </form>
  )
}
