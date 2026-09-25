"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChartBarIcon, GearSixIcon, RobotIcon, TagIcon, UsersThreeIcon } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { pub } from "@/config/copy"

const ITEMS = [
  { href: "/admin", label: "Painel", icon: ChartBarIcon, exact: true },
  { href: "/admin/usuarios", label: pub.Varios, icon: UsersThreeIcon },
  { href: "/admin/agentes", label: "Agentes", icon: RobotIcon },
  { href: "/admin/temas", label: "Temas e dificuldades", icon: TagIcon },
  { href: "/admin/configuracoes", label: "Configurações", icon: GearSixIcon },
]

/* Navegação do admin: abas em linha, véu no item ativo, rola de lado no celular. */
export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Seções do admin" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex w-max items-center gap-1 md:w-auto md:flex-wrap">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-control px-3 text-ui whitespace-nowrap text-ink-2 transition-colors duration-100 hover:bg-hover hover:text-ink",
                  active && "bg-press font-medium text-ink hover:bg-press"
                )}
              >
                <Icon className="size-[18px]" weight={active ? "fill" : "regular"} />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
