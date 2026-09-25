"use client"

import { useState, useTransition } from "react"
import { ChartBarIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { acceptTerms } from "@/app/(app)/actions"

/* Primeiro acesso: aviso de análise agregada. Só fecha com "Entendi". */
export function TermsNotice() {
  const [open, setOpen] = useState(true)
  const [pending, startTransition] = useTransition()
  return (
    <Dialog open={open} disablePointerDismissal>
      <DialogContent showCloseButton={false}>
        <DialogHeader className="pr-0">
          <span className="mb-2 flex size-10 items-center justify-center rounded-control bg-bubble text-ink">
            <ChartBarIcon className="size-5" />
          </span>
          <DialogTitle>Antes de começar</DialogTitle>
          <DialogDescription>
            Suas conversas são analisadas de forma agregada para melhorar o conteúdo. Ninguém usa isso para julgar você, e
            os agentes não mudam as respostas por causa disso.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            size="lg"
            className="max-sm:w-full"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await acceptTerms()
                if (res.ok) setOpen(false)
                else toast.error(res.error)
              })
            }
          >
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
