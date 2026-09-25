"use client"

import { useTransition } from "react"
import { toast } from "sonner"
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

type Result = { ok: true } | { ok: false; error: string }

/* Pede um nome (criar ou renomear pasta/tag). */
export function NameDialog({
  open,
  onOpenChange,
  title,
  label,
  defaultValue = "",
  submitLabel = "Salvar",
  maxLength = 80,
  onSubmit,
  success,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  label: string
  defaultValue?: string
  submitLabel?: string
  maxLength?: number
  onSubmit: (value: string) => Promise<Result>
  success?: string
}) {
  const [pending, startTransition] = useTransition()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            const value = String(new FormData(e.currentTarget).get("value") ?? "")
            startTransition(async () => {
              const res = await onSubmit(value)
              if (!res.ok) {
                toast.error(res.error)
                return
              }
              if (success) toast(success)
              onOpenChange(false)
            })
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <Input
            name="value"
            aria-label={label}
            placeholder={label}
            defaultValue={defaultValue}
            maxLength={maxLength}
            autoFocus
            required
            className="h-11 text-body"
          />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="secondary" size="lg" className="max-sm:w-full" />}>
              Cancelar
            </DialogClose>
            <Button type="submit" size="lg" disabled={pending} className="max-sm:w-full">
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* Confirmação de ação destrutiva. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  success,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmLabel: string
  onConfirm: () => Promise<Result>
  success?: string
}) {
  const [pending, startTransition] = useTransition()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="secondary" size="lg" className="max-sm:w-full" />}>Cancelar</DialogClose>
          <Button
            variant="danger"
            size="lg"
            className="max-sm:w-full"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await onConfirm()
                if (!res.ok) {
                  toast.error(res.error)
                  return
                }
                if (success) toast(success)
                onOpenChange(false)
              })
            }
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* Estado vazio das listas. */
export function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-line text-ink-2 [&_svg]:size-6">{icon}</span>
      <p className="text-body font-semibold text-ink">{title}</p>
      {text && <p className="max-w-sm text-ui text-ink-2">{text}</p>}
      {action}
    </div>
  )
}
