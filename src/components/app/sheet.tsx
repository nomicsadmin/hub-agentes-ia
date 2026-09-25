"use client"

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"

/*
 * Painéis do celular: "bottom" (ações da conversa, toque longo) e
 * "left" (gaveta da barra lateral). Plano, linha de 1px, scrim de 50%.
 */
export function Sheet({
  open,
  onOpenChange,
  side = "bottom",
  title,
  hideTitle,
  className,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  side?: "bottom" | "left"
  title: string
  hideTitle?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-scrim duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className={cn(
            "fixed z-50 flex flex-col bg-surface text-ink outline-none",
            side === "bottom" &&
              "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-panel border-t border-line pb-[max(env(safe-area-inset-bottom),12px)] duration-250 ease-out data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom",
            side === "left" &&
              "inset-y-0 left-0 w-[min(88vw,340px)] border-r border-line bg-rail pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] duration-250 ease-out data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left",
            className
          )}
        >
          <DialogPrimitive.Title className={cn(hideTitle && "sr-only")}>
            {!hideTitle && side === "bottom" ? (
              <span className="flex flex-col items-center gap-3 px-5 pt-2.5 pb-2">
                <span aria-hidden className="h-1 w-9 rounded-full bg-line-strong" />
                <span className="w-full truncate text-center text-ui font-semibold text-ink">{title}</span>
              </span>
            ) : (
              title
            )}
          </DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/* Linha de ação do bottom sheet: 48px, ícone e texto. */
export function SheetAction({
  icon,
  label,
  onClick,
  danger,
  trailing,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
  trailing?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-12 w-full items-center gap-3.5 rounded-control px-3 text-left text-body transition-colors active:bg-press [&_svg]:size-5 [&_svg]:shrink-0",
        danger ? "text-danger [&_svg]:text-danger" : "text-ink [&_svg]:text-ink-2"
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </button>
  )
}
