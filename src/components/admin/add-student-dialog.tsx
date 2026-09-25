"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { UserPlusIcon } from "@phosphor-icons/react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { addStudentAction } from "@/lib/admin/actions"
import { Field } from "./primitives"
import { pub, g } from "@/config/copy"

/* Libera alguém sem compra pelo webhook: a pessoa recebe o convite para definir a senha. */
export function AddStudentDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit(form: FormData) {
    setError(null)
    start(async () => {
      const res = await addStudentAction({
        email: String(form.get("email") ?? ""),
        fullName: String(form.get("fullName") ?? ""),
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      toast.success(
        res.data.invited
          ? `${pub.Um} ${g("adicionado", "adicionada")}. O convite para definir a senha foi enviado por e-mail.`
          : "Esse e-mail já tinha conta. O acesso foi liberado."
      )
      setOpen(false)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <DialogTrigger render={<Button />}>
        <UserPlusIcon />
        Adicionar {pub.um}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar {pub.um}</DialogTitle>
          <DialogDescription>
            Use para liberar alguém que não comprou pela plataforma de pagamento. Se o e-mail ainda não tem conta, a pessoa recebe um convite
            para definir a senha.
          </DialogDescription>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4" noValidate>
          <Field label="E-mail" htmlFor="add-email" error={error}>
            <Input
              id="add-email"
              name="email"
              type="email"
              autoComplete="off"
              required
              placeholder="nome@exemplo.com"
              aria-invalid={!!error}
            />
          </Field>
          <Field label="Nome (opcional)" htmlFor="add-name" help="Aparece na tabela e no convite.">
            <Input id="add-name" name="fullName" autoComplete="off" placeholder={`Nome ${pub.do} ${pub.um}`} />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" disabled={pending} />}>Cancelar</DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Enviando convite..." : "Liberar e enviar convite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
