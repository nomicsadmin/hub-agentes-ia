"use client"

import { useState } from "react"
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/*
 * Campos das telas de acesso: rótulo acima, ajuda e erro abaixo,
 * 44px de altura e fonte de 16px (o iOS não dá zoom no foco).
 */
export function Field({
  id,
  label,
  error,
  help,
  children,
}: {
  id: string
  label: string
  error?: string
  help?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-ui font-medium text-ink">
        {label}
      </label>
      {children}
      {help || error ? (
        <div id={`${id}-msg`} className="flex flex-col gap-1.5">
          {help ? <div className="text-meta text-ink-3">{help}</div> : null}
          {error ? <p className="text-meta text-danger">{error}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

export const fieldInputClass = "h-11 text-body"

export function TextField({
  id,
  error,
  className,
  ...props
}: React.ComponentProps<"input"> & { id: string; error?: string }) {
  return (
    <Input
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={`${id}-msg`}
      className={cn(fieldInputClass, className)}
      {...props}
    />
  )
}

/* Senha com botão de mostrar/ocultar (alvo de 44px). */
export function PasswordField({
  id,
  error,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & { id: string; error?: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-msg`}
        className={cn(fieldInputClass, "pr-12", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-control text-ink-3 outline-none transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-(--focus)"
      >
        {visible ? <EyeSlashIcon className="size-5" /> : <EyeIcon className="size-5" />}
      </button>
    </div>
  )
}

/* Erro geral do formulário (lido pelo leitor de tela ao aparecer). */
export function FormError({ message }: { message?: string }) {
  return (
    <p role="alert" aria-live="polite" className={cn("text-ui text-danger", !message && "sr-only")}>
      {message ?? ""}
    </p>
  )
}
