"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Field, FormError, PasswordField, TextField } from "../_components/fields"
import { login, type LoginState } from "./actions"

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {})

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {notice && !state.error ? (
        <p role="alert" className="text-ui text-danger">
          {notice}
        </p>
      ) : null}

      <Field id="email" label="E-mail" error={state.fieldErrors?.email}>
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
          error={state.fieldErrors?.email}
        />
      </Field>

      <Field id="password" label="Senha" error={state.fieldErrors?.password}>
        <PasswordField
          id="password"
          name="password"
          autoComplete="current-password"
          required
          error={state.fieldErrors?.password}
        />
      </Field>

      <FormError message={state.error} />

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>

      <Link
        href="/esqueci-senha"
        className="inline-flex min-h-11 items-center justify-center text-ui text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink hover:decoration-ink"
      >
        Esqueci minha senha
      </Link>
    </form>
  )
}
