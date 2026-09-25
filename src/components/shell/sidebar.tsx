"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArchiveIcon,
  ChartBarIcon,
  CheckSquareIcon,
  CompassIcon,
  DotsThreeIcon,
  FolderSimpleIcon,
  GearSixIcon,
  LightbulbIcon,
  MagnifyingGlassIcon,
  NotePencilIcon,
  PenNibIcon,
  PushPinIcon,
  SidebarSimpleIcon,
  TagIcon,
  TrashIcon,
  VideoCameraIcon,
  XIcon,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Kbd } from "@/components/ui/kbd"
import { Tip } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Agent } from "@/lib/demo"
import { useAppData } from "@/components/app/app-data"
import { ConversationMenuItems, useConversationActions } from "@/components/app/conversation-actions"
import { groupConversations } from "@/components/app/dates"
import { useLongPress } from "@/components/app/hooks"
import type { ConversationSummary } from "@/components/app/types"
import { RailItem } from "./rail-item"
import { useShell } from "./shell-context"
import { ThemeToggle } from "./theme-toggle"
import { appConfig } from "@/config/app.config"

export { RailItem }

/* Ícones dos agentes de exemplo do Design System (/design-system). */
export const AGENT_ICONS: Record<Agent["icon"], React.ReactNode> = {
  strategy: <LightbulbIcon />,
  copy: <PenNibIcon />,
  script: <VideoCameraIcon />,
  review: <CheckSquareIcon />,
}

const SPACE = [
  { href: "/pastas", label: "Todas as pastas", icon: <FolderSimpleIcon /> },
  { href: "/tags", label: "Todas as tags", icon: <TagIcon /> },
  { href: "/fixadas", label: "Fixadas", icon: <PushPinIcon /> },
  { href: "/arquivadas", label: "Arquivadas", icon: <ArchiveIcon /> },
  { href: "/lixeira", label: "Lixeira", icon: <TrashIcon /> },
]

export function initials(name: string | null | undefined, email: string) {
  const base = (name?.trim() || email.split("@")[0]).split(/[\s._-]+/).filter(Boolean)
  return ((base[0]?.[0] ?? "") + (base.length > 1 ? (base[base.length - 1][0] ?? "") : "")).toUpperCase() || "?"
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/*
 * BARRA LATERAL DO APP
 * mode "full": 260px (desktop) ou dentro da gaveta (celular).
 * mode "rail": trilho só com ícones (desktop recolhido).
 */
export function Sidebar({
  conversations,
  mode = "full",
  inDrawer = false,
}: {
  conversations: ConversationSummary[]
  mode?: "full" | "rail"
  inDrawer?: boolean
}) {
  const pathname = usePathname()
  const { profile } = useAppData()
  const shell = useShell()
  const isAdmin = profile.role === "admin"
  const name = profile.fullName?.trim() || profile.email.split("@")[0]

  if (mode === "rail") {
    return (
      <nav aria-label="Navegação principal" className="flex h-full w-full flex-col items-center gap-1 bg-rail py-2">
        <Tip label="Abrir barra lateral" side="right">
          <button
            type="button"
            aria-label="Abrir barra lateral"
            onClick={shell.toggleCollapsed}
            className="mb-2 flex size-10 items-center justify-center rounded-control text-ink-2 transition-colors hover:bg-hover hover:text-ink"
          >
            <SidebarSimpleIcon className="size-5" />
          </button>
        </Tip>
        <RailItem collapsed href="/chat" icon={<NotePencilIcon />} label="Novo chat" active={pathname === "/chat"} />
        <RailItem collapsed href="/explorar" icon={<CompassIcon />} label="Agentes" active={isActive(pathname, "/explorar")} />
        <RailItem collapsed onClick={shell.openSearch} icon={<MagnifyingGlassIcon />} label="Buscar (⌘K)" />
        <span className="my-2 h-px w-6 bg-line" aria-hidden />
        {SPACE.map((s) => (
          <RailItem key={s.href} collapsed href={s.href} icon={s.icon} label={s.label} active={isActive(pathname, s.href)} />
        ))}
        <span className="flex-1" />
        {isAdmin && <RailItem collapsed href="/admin" icon={<ChartBarIcon />} label="Painel" active={isActive(pathname, "/admin")} />}
        <RailItem collapsed href="/configuracoes" icon={<GearSixIcon />} label="Configurações" active={isActive(pathname, "/configuracoes")} />
        <ThemeToggle side="right" />
        <Tip label={name} side="right">
          <Link href="/configuracoes" aria-label={`Perfil: ${name}`} className="mt-1 flex size-10 items-center justify-center rounded-control hover:bg-hover">
            <Avatar className="size-8">
              <AvatarFallback>{initials(profile.fullName, profile.email)}</AvatarFallback>
            </Avatar>
          </Link>
        </Tip>
      </nav>
    )
  }

  const groups = groupConversations(conversations)

  return (
    <nav aria-label="Navegação principal" className="flex h-full w-full flex-col bg-rail">
      <div className="flex h-(--header-h) shrink-0 items-center justify-between px-2">
        <Link href="/chat" className="type-display px-2.5 text-body font-semibold tracking-[-0.01em] text-ink max-md:px-3 max-md:text-h3">
          {appConfig.name}
        </Link>
        {inDrawer ? (
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={shell.closeDrawer}
            className="flex size-11 items-center justify-center rounded-control text-ink-2 transition-colors hover:bg-hover hover:text-ink"
          >
            <XIcon className="size-5" />
          </button>
        ) : (
          <Tip label="Fechar barra lateral" side="right">
            <button
              type="button"
              aria-label="Fechar barra lateral"
              onClick={shell.toggleCollapsed}
              className="flex size-9 items-center justify-center rounded-control text-ink-2 transition-colors hover:bg-hover hover:text-ink"
            >
              <SidebarSimpleIcon className="size-5" />
            </button>
          </Tip>
        )}
      </div>

      <div className="flex flex-col gap-px px-2">
        <RailItem href="/chat" icon={<NotePencilIcon />} label="Novo chat" active={pathname === "/chat"} />
        <RailItem href="/explorar" icon={<CompassIcon />} label="Agentes" active={isActive(pathname, "/explorar")} />
        <RailItem
          icon={<MagnifyingGlassIcon />}
          label="Buscar"
          onClick={shell.openSearch}
          trailing={
            <span className="hidden gap-0.5 md:group-hover/item:flex">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          }
        />
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4">
        <section>
          <h2 className="type-label px-2.5 pb-1 text-micro font-medium tracking-[0.06em] text-ink-3 uppercase max-md:px-3 max-md:pb-1.5 max-md:text-meta">Seu espaço</h2>
          <div className="flex flex-col gap-px">
            {SPACE.map((s) => (
              <RailItem key={s.href} href={s.href} icon={s.icon} label={s.label} active={isActive(pathname, s.href)} />
            ))}
          </div>
        </section>

        {groups.length === 0 ? (
          <p className="mt-6 px-2.5 text-meta text-ink-3">Suas conversas aparecem aqui.</p>
        ) : (
          groups.map((g) => (
            <section key={g.label} className="mt-5">
              <h2 className="type-label px-2.5 pb-1 text-meta font-medium text-ink-3 max-md:px-3 max-md:pb-1.5 max-md:text-ui">{g.label}</h2>
              <ul className="flex flex-col gap-px">
                {g.items.map((c) => (
                  <li key={c.id}>
                    <ConversationItem conv={c} active={pathname === `/chat/${c.id}`} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-line p-2">
        {isAdmin && <RailItem href="/admin" icon={<ChartBarIcon />} label="Painel" active={isActive(pathname, "/admin")} />}
        <RailItem href="/configuracoes" icon={<GearSixIcon />} label="Configurações" active={isActive(pathname, "/configuracoes")} />
        <div className="mt-1 flex items-center gap-1">
          <Link
            href="/configuracoes"
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-control px-2 py-2 text-left transition-colors hover:bg-hover"
          >
            <Avatar className="size-8 max-md:size-10">
              <AvatarFallback>{initials(profile.fullName, profile.email)}</AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-ui font-medium text-ink max-md:text-body">{name}</span>
              <span className="truncate text-micro text-ink-3">{profile.email}</span>
            </span>
          </Link>
          <ThemeToggle side="top" />
        </div>
      </div>
    </nav>
  )
}

/* Conversa na lista: link; "⋯" no hover (desktop) e toque longo (celular). */
function ConversationItem({ conv, active }: { conv: ConversationSummary; active: boolean }) {
  const actions = useConversationActions()
  const press = useLongPress(() => actions.openSheet(conv))
  return (
    <div className="group/item relative">
      <Link
        href={`/chat/${conv.id}`}
        aria-current={active ? "page" : undefined}
        {...press}
        className={cn(
          "flex h-9 w-full items-center rounded-control pr-9 pl-2.5 text-ui text-ink transition-colors duration-100 select-none [-webkit-touch-callout:none] hover:bg-hover max-md:h-12 max-md:pr-3 max-md:pl-3 max-md:text-body",
          active && "bg-press hover:bg-press"
        )}
      >
        <span className="min-w-0 flex-1 truncate">{conv.title}</span>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label={`Opções de ${conv.title}`}
              className={cn(
                "absolute top-1/2 right-1 hidden size-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-hover hover:text-ink focus-visible:flex data-popup-open:flex md:group-hover/item:flex",
                active && "md:flex"
              )}
            />
          }
        >
          <DotsThreeIcon weight="bold" className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <ConversationMenuItems conv={conv} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
