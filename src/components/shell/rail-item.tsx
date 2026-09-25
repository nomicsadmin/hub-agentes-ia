"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Tip } from "@/components/ui/tooltip"

/* Linha da barra lateral: transparente em repouso, véu de 5% no hover,
 * véu de 8% quando é a página aberta. Nunca cor. No celular tem 44px.
 * Com `collapsed` vira só o ícone (trilho do desktop), com dica. */
export function RailItem({
  icon,
  label,
  active,
  trailing,
  onClick,
  href,
  collapsed,
  className,
}: {
  icon?: React.ReactNode
  label: string
  active?: boolean
  trailing?: React.ReactNode
  onClick?: () => void
  href?: string
  collapsed?: boolean
  className?: string
}) {
  const classes = cn(
    "group/item flex h-9 w-full items-center gap-2.5 rounded-control px-2.5 text-left text-ui text-ink transition-colors duration-100 hover:bg-hover max-md:h-12 max-md:gap-3.5 max-md:px-3 max-md:text-body",
    active && "bg-press hover:bg-press",
    collapsed && "size-10 justify-center px-0 max-md:size-11",
    className
  )
  const content = (
    <>
      {icon && <span className="flex size-5 shrink-0 items-center justify-center [&_svg]:size-[18px] max-md:size-6 max-md:[&_svg]:size-[22px]">{icon}</span>}
      {collapsed ? <span className="sr-only">{label}</span> : <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && trailing}
    </>
  )
  const el = href ? (
    <Link href={href} onClick={onClick} aria-current={active ? "page" : undefined} className={classes}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} className={classes}>
      {content}
    </button>
  )
  return collapsed ? (
    <Tip label={label} side="right">
      {el}
    </Tip>
  ) : (
    el
  )
}
