"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowClockwiseIcon, CheckIcon, CopyIcon } from "@phosphor-icons/react"
import { Button, buttonVariants } from "@/components/ui/button"

export function SetupActions({ done }: { done: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant={done ? "secondary" : "primary"} onClick={() => start(() => router.refresh())} disabled={pending}>
        <ArrowClockwiseIcon className={pending ? "animate-spin" : undefined} />
        {pending ? "Verificando..." : "Verificar de novo"}
      </Button>
      {done && (
        <Link href="/login" className={buttonVariants({ variant: "primary" })}>
          Entrar no app
        </Link>
      )}
    </div>
  )
}

export function CopyHelp({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="pl-8">
      <Button
        variant="secondary"
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2500)
          } catch {
            window.prompt("Copie o texto abaixo:", text)
          }
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? "Copiado! Cole na sua IA" : "Pedir ajuda para a IA"}
      </Button>
    </div>
  )
}
