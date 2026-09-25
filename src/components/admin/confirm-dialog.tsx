"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/* Confirmação antes de uma ação sensível. Fecha sozinha quando a ação dá certo. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  danger,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmLabel: string
  danger?: boolean
  onConfirm: () => Promise<boolean>
}) {
  const [pending, start] = useTransition()
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="secondary" disabled={pending} />}>Cancelar</DialogClose>
          <Button
            variant={danger ? "danger" : "primary"}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const ok = await onConfirm()
                if (ok) onOpenChange(false)
              })
            }
          >
            {pending ? "Aguarde..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
