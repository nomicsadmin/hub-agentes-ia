"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  DotsThreeIcon,
  LockKeyIcon,
  LockKeyOpenIcon,
  ShieldCheckIcon,
  ShieldSlashIcon,
  UserIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { setUserRoleAction, setUserStatusAction } from "@/lib/admin/actions"
import { ConfirmDialog } from "./confirm-dialog"
import { pub } from "@/config/copy"

type Target = { id: string; name: string | null; email: string; role: string; status: string }
type Pending = "block" | "unblock" | "promote" | "demote" | null

/* Menu de ações de um usuário: liberar/bloquear e promover/remover admin, sempre com confirmação. */
export function UserActions({
  user,
  isSelf,
  showProfileLink = true,
  variant = "menu",
}: {
  user: Target
  isSelf: boolean
  showProfileLink?: boolean
  variant?: "menu" | "buttons"
}) {
  const [pending, setPending] = useState<Pending>(null)
  const who = user.name || user.email
  const blocked = user.status === "blocked"
  const admin = user.role === "admin"

  async function confirm() {
    const res =
      pending === "block" || pending === "unblock"
        ? await setUserStatusAction({ userId: user.id, status: pending === "block" ? "blocked" : "active" })
        : await setUserRoleAction({ userId: user.id, role: pending === "promote" ? "admin" : "student" })
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    toast.success(
      pending === "block"
        ? "Acesso bloqueado."
        : pending === "unblock"
          ? "Acesso liberado."
          : pending === "promote"
            ? `Agora ${pub.ele} é admin.`
            : `Voltou a ser ${pub.um}.`
    )
    return true
  }

  const copy: Record<Exclude<Pending, null>, { title: string; description: string; label: string; danger?: boolean }> = {
    block: {
      title: "Bloquear o acesso?",
      description: `${who} deixa de entrar no app na hora. As conversas ficam guardadas e voltam quando o acesso for liberado.`,
      label: "Bloquear acesso",
      danger: true,
    },
    unblock: {
      title: "Liberar o acesso?",
      description: `${who} volta a entrar no app com o mesmo e-mail e senha. Se o bloqueio veio de um reembolso na plataforma de pagamento, confirme antes que o acesso deve voltar.`,
      label: "Liberar acesso",
    },
    promote: {
      title: "Promover a admin?",
      description: `${who} passa a ver o painel, as conversas analisadas, os prompts e os documentos dos agentes, e pode mudar acessos de outras pessoas.`,
      label: "Promover a admin",
    },
    demote: {
      title: "Remover o acesso de admin?",
      description: `${who} volta a ser ${pub.um} e deixa de ver o painel admin.`,
      label: "Remover admin",
      danger: true,
    },
  }

  const dialog = pending && (
    <ConfirmDialog
      open={!!pending}
      onOpenChange={(open) => !open && setPending(null)}
      title={copy[pending].title}
      description={copy[pending].description}
      confirmLabel={copy[pending].label}
      danger={copy[pending].danger}
      onConfirm={confirm}
    />
  )

  if (variant === "buttons") {
    return (
      <>
        <Button variant="secondary" disabled={isSelf && !blocked} onClick={() => setPending(blocked ? "unblock" : "block")}>
          {blocked ? <LockKeyOpenIcon /> : <LockKeyIcon />}
          {blocked ? "Liberar acesso" : "Bloquear acesso"}
        </Button>
        <Button variant="secondary" disabled={isSelf && admin} onClick={() => setPending(admin ? "demote" : "promote")}>
          {admin ? <ShieldSlashIcon /> : <ShieldCheckIcon />}
          {admin ? "Remover admin" : "Promover a admin"}
        </Button>
        {dialog}
      </>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="quiet" size="icon-sm" aria-label={`Ações para ${who}`} />}>
          <DotsThreeIcon weight="bold" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {showProfileLink && (
            <>
              <DropdownMenuItem render={<Link href={`/admin/usuarios/${user.id}`} />}>
                <UserIcon />
                Ver perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {blocked ? (
            <DropdownMenuItem onClick={() => setPending("unblock")}>
              <LockKeyOpenIcon />
              Liberar acesso
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem variant="destructive" disabled={isSelf} onClick={() => setPending("block")}>
              <LockKeyIcon />
              Bloquear acesso
            </DropdownMenuItem>
          )}
          {admin ? (
            <DropdownMenuItem disabled={isSelf} onClick={() => setPending("demote")}>
              <ShieldSlashIcon />
              Remover admin
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setPending("promote")}>
              <ShieldCheckIcon />
              Promover a admin
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog}
    </>
  )
}
