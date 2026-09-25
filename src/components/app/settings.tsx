"use client"

import Link from "next/link"
import { useState, useSyncExternalStore, useTransition } from "react"
import { useTheme } from "next-themes"
import { ChartBarIcon, DesktopIcon, KeyIcon, MoonIcon, SignOutIcon, SunIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { updateName } from "@/app/(app)/actions"
import { withBase } from "@/lib/base-path"

const THEMES = [
  { value: "light", label: "Claro", icon: <SunIcon /> },
  { value: "dark", label: "Escuro", icon: <MoonIcon /> },
  { value: "system", label: "Sistema", icon: <DesktopIcon /> },
]

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-line py-6 first:pt-0 last:border-0">
      <div className="flex flex-col gap-1">
        <h2 className="type-label text-body font-semibold text-ink">{title}</h2>
        {description && <p className="text-ui text-ink-2">{description}</p>}
      </div>
      {children}
    </section>
  )
}

export function SettingsView({ name, email, isAdmin }: { name: string; email: string; isAdmin: boolean }) {
  const [pending, startTransition] = useTransition()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  return (
    <div className="flex flex-col">
      <Section title="Perfil">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            const value = String(new FormData(e.currentTarget).get("name") ?? "")
            startTransition(async () => {
              const res = await updateName(value)
              if (res.ok) toast("Nome salvo")
              else toast.error(res.error)
            })
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-medium text-ink-2">Nome</span>
            <Input name="name" defaultValue={name} autoComplete="name" maxLength={80} required className="h-11 text-body" />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-meta font-medium text-ink-2">E-mail</span>
            <p className="flex h-11 items-center rounded-control border border-line px-3 text-body text-ink-2">{email}</p>
          </div>
          <Button type="submit" size="lg" disabled={pending} className="self-start max-sm:w-full">
            Salvar nome
          </Button>
        </form>
      </Section>

      <Section title="Tema">
        <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => {
            const on = mounted && theme === t.value
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setTheme(t.value)}
                className={cn(
                  "flex h-12 items-center justify-center gap-2 rounded-control border text-ui font-medium transition-colors [&_svg]:size-[18px]",
                  on ? "border-ink bg-press text-ink" : "border-line text-ink-2 hover:bg-hover hover:text-ink"
                )}
              >
                {t.icon}
                {t.label}
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="Conta">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" size="lg" className="max-sm:w-full" onClick={() => setPasswordOpen(true)}>
            <KeyIcon />
            Trocar senha
          </Button>
          {isAdmin && (
            <Link
              href="/admin"
              className="type-label flex h-11 items-center justify-center gap-2 rounded-control border border-line bg-surface px-5 text-body font-medium text-ink transition-colors hover:border-line-strong hover:bg-hover"
            >
              <ChartBarIcon className="size-5" />
              Abrir o painel
            </Link>
          )}
          <form action={withBase("/auth/sair")} method="post" className="max-sm:w-full">
            <Button type="submit" variant="quiet" size="lg" className="w-full text-danger hover:text-danger">
              <SignOutIcon />
              Sair
            </Button>
          </form>
        </div>
      </Section>

      <p className="pt-2 text-micro text-ink-3">
        Suas conversas são analisadas de forma agregada para melhorar o conteúdo.
      </p>

      <PasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </div>
  )
}

function PasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setError(null)
      }}
    >
      <DialogContent>
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            const form = new FormData(e.currentTarget)
            const password = String(form.get("password") ?? "")
            const confirm = String(form.get("confirm") ?? "")
            if (password.length < 6) return setError("Use pelo menos 6 caracteres.")
            if (password !== confirm) return setError("As duas senhas precisam ser iguais.")
            setError(null)
            startTransition(async () => {
              const { error: authError } = await createClient().auth.updateUser({ password })
              if (authError) {
                setError(
                  /different|same/i.test(authError.message)
                    ? "A nova senha precisa ser diferente da atual."
                    : /weak|short/i.test(authError.message)
                      ? "Senha muito fácil de adivinhar. Evite sequências como 123456."
                      : "Não foi possível trocar a senha. Tente de novo."
                )
                return
              }
              toast("Senha trocada")
              onOpenChange(false)
            })
          }}
        >
          <DialogHeader>
            <DialogTitle>Trocar senha</DialogTitle>
            <DialogDescription>A nova senha vale a partir do próximo login.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-meta font-medium text-ink-2">Nova senha</span>
              <Input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                aria-invalid={!!error}
                className="h-11 text-body"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-meta font-medium text-ink-2">Repita a nova senha</span>
              <Input name="confirm" type="password" autoComplete="new-password" minLength={6} required aria-invalid={!!error} className="h-11 text-body" />
            </label>
            {error && (
              <p role="alert" className="text-meta text-danger">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="secondary" size="lg" className="max-sm:w-full" />}>Cancelar</DialogClose>
            <Button type="submit" size="lg" disabled={pending} className="max-sm:w-full">
              Salvar senha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
