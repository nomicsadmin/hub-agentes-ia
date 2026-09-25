"use client"

import { useActionState, useState } from "react"
import { CheckIcon, CircleIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Field, FormError, PasswordField } from "../_components/fields"
import { setPassword, type SetPasswordState } from "./actions"

const RULES = [
  { label: "Pelo menos 6 caracteres (pode ser só números)", test: (v: string) => v.length >= 6 },
]

export function SetPasswordForm({ email }: { email?: string }) {
  const [state, action, pending] = useActionState<SetPasswordState, FormData>(setPassword, {})
  const [value, setValue] = useState("")

  return (
    <form action={action} onReset={() => setValue("")} noValidate className="flex flex-col gap-5">
      {/* ajuda o gerenciador de senhas a salvar no lugar certo */}
      <input type="email" name="username" autoComplete="username" value={email ?? ""} readOnly hidden />

      <Field
        id="password"
        label="Nova senha"
        error={state.fieldErrors?.password}
        help={
          <ul className="flex flex-col gap-1" aria-label="Requisitos da senha">
            {RULES.map((rule) => {
              const ok = rule.test(value)
              return (
                <li key={rule.label} className={cn("flex items-center gap-2", ok ? "text-ink" : "text-ink-3")}>
                  {ok ? (
                    <CheckIcon className="size-4" weight="bold" aria-hidden />
                  ) : (
                    <CircleIcon className="size-4" aria-hidden />
                  )}
                  <span>
                    {rule.label}
                    <span className="sr-only">{ok ? ": ok" : ": falta"}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        }
      >
        <PasswordField
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={6}
          onChange={(e) => setValue(e.target.value)}
          error={state.fieldErrors?.password}
        />
      </Field>

      <Field id="confirm" label="Confirme a nova senha" error={state.fieldErrors?.confirm}>
        <PasswordField
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          required
          error={state.fieldErrors?.confirm}
        />
      </Field>

      <FormError message={state.error} />

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : "Salvar senha e entrar"}
      </Button>
    </form>
  )
}
