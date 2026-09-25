import { cn } from "@/lib/utils"

/* Peças de layout da página do Design System. */

export function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string
  title: string
  intro?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-line pt-12 pb-4 first:border-t-0 first:pt-0">
      <h2 className="type-display text-display font-semibold text-ink">{title}</h2>
      {intro && <p className="mt-2 max-w-[62ch] text-body text-ink-2">{intro}</p>}
      <div className="mt-8 flex flex-col gap-12">{children}</div>
    </section>
  )
}

export function Block({
  title,
  note,
  children,
  className,
}: {
  title: string
  note?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-1">
        <h3 className="text-body font-semibold text-ink">{title}</h3>
        {note && <p className="max-w-[68ch] text-ui text-ink-2">{note}</p>}
      </div>
      {children}
    </div>
  )
}

/* Área de amostra: a mesma linha fina de 1px que o sistema usa para elevar. */
export function Stage({
  children,
  className,
  tone = "canvas",
}: {
  children: React.ReactNode
  className?: string
  tone?: "canvas" | "rail"
}) {
  return (
    <div
      className={cn(
        "rounded-panel border border-line p-6 max-sm:p-4",
        tone === "rail" ? "bg-rail" : "bg-canvas",
        className
      )}
    >
      {children}
    </div>
  )
}

export function Spec({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-micro text-ink-3">{children}</code>
}
