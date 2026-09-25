import { cn } from "@/lib/utils"

/*
 * Peças do admin, no Grafite: plano, linha de 1px, sem sombra,
 * hierarquia por peso e tom de cinza, números tabulares.
 */

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  back?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        {back}
        <h1 className="type-display text-h2 font-semibold text-ink">{title}</h1>
        {description && <p className="max-w-[68ch] text-ui text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function SectionTitle({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-body font-semibold text-ink">{title}</h2>
        {description && <p className="max-w-[68ch] text-meta font-normal text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-control border border-line bg-canvas", className)}>{children}</div>
}

export function StatCard({
  label,
  value,
  hint,
  strong,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  strong?: boolean
}) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-control border border-line p-4", strong ? "bg-bubble" : "bg-canvas")}>
      <span className="text-meta text-ink-2">{label}</span>
      <span className="text-h2 font-semibold text-ink tabular-nums">{value}</span>
      {hint && <span className="text-micro text-ink-3">{hint}</span>}
    </div>
  )
}

export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-1.5 rounded-control border border-dashed border-line-strong px-5 py-6",
        className
      )}
    >
      <p className="text-ui font-medium text-ink">{title}</p>
      {children && <p className="max-w-[60ch] text-ui text-ink-2">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/* Tabela com rolagem horizontal própria (no celular a página não rola de lado). */
export function DataTable({
  children,
  minWidth = 720,
  className,
  label,
}: {
  children: React.ReactNode
  minWidth?: number
  className?: string
  label?: string
}) {
  return (
    <div
      className={cn("overflow-x-auto rounded-control border border-line", className)}
      role="region"
      aria-label={label}
      tabIndex={label ? 0 : undefined}
    >
      <table className="w-full border-collapse text-left text-ui" style={{ minWidth }}>
        {children}
      </table>
    </div>
  )
}

export function Th({ children, className, align }: { children?: React.ReactNode; className?: string; align?: "right" }) {
  return (
    <th
      scope="col"
      className={cn(
        "h-10 border-b border-line bg-rail px-3 text-meta font-medium whitespace-nowrap text-ink-2",
        align === "right" && "text-right",
        className
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  className,
  align,
  colSpan,
}: {
  children?: React.ReactNode
  className?: string
  align?: "right"
  colSpan?: number
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "border-b border-line px-3 py-2.5 align-middle text-ink group-last/row:border-b-0",
        align === "right" && "text-right tabular-nums",
        className
      )}
    >
      {children}
    </td>
  )
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("group/row transition-colors duration-100 hover:bg-hover", className)}>{children}</tr>
}

/* Barras verticais por semana: tinta sólida na semana atual, cinza nas outras. */
export function WeekBars({
  data,
  label,
  unit,
}: {
  data: { label: string; value: number }[]
  label: string
  unit: [string, string]
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const fmt = new Intl.NumberFormat("pt-BR")
  return (
    <figure className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div className="flex h-44 min-w-[480px] items-end gap-1.5" aria-hidden>
          {data.map((d, i) => {
            const last = i === data.length - 1
            return (
              <div key={d.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                <span className={cn("text-micro tabular-nums", last ? "font-semibold text-ink" : "text-ink-3")}>
                  {fmt.format(d.value)}
                </span>
                <div
                  className={cn("w-full max-w-10 rounded-t-[4px]", last ? "bg-ink" : "bg-ink-4/45")}
                  style={{ height: `${d.value === 0 ? 2 : Math.max(4, (d.value / max) * 100)}%` }}
                />
                <span className={cn("text-micro tabular-nums", last ? "font-medium text-ink" : "text-ink-3")}>{d.label}</span>
              </div>
            )
          })}
        </div>
      </div>
      <figcaption className="sr-only">
        {label}:{" "}
        {data.map((d) => `semana de ${d.label}, ${fmt.format(d.value)} ${d.value === 1 ? unit[0] : unit[1]}`).join("; ")}
      </figcaption>
    </figure>
  )
}

/* Ranking com barra horizontal: o primeiro em tinta, os demais em cinza. */
export function RankList({
  items,
  valueLabel,
  empty,
}: {
  items: { key: string; label: string; value: number; display?: string; detail?: string }[]
  valueLabel: string
  empty?: React.ReactNode
}) {
  if (items.length === 0) return <>{empty}</>
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ol className="flex flex-col gap-3" aria-label={valueLabel}>
      {items.map((item, index) => (
        <li key={item.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="w-5 shrink-0 text-right text-micro text-ink-3 tabular-nums">{index + 1}</span>
              <span className={cn("truncate text-ui", index === 0 ? "font-semibold text-ink" : "text-ink")}>
                {item.label}
              </span>
            </span>
            <span className="shrink-0 text-ui font-medium text-ink tabular-nums">
              {item.display ?? new Intl.NumberFormat("pt-BR").format(item.value)}
              {item.detail && <span className="ml-1.5 text-micro font-normal text-ink-3">{item.detail}</span>}
            </span>
          </div>
          <div className="ml-7 h-1.5 rounded-full bg-hover">
            <div
              className={cn("h-full rounded-full", index === 0 ? "bg-ink" : "bg-ink-4/60")}
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  )
}

export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-10 min-w-0 rounded-control border border-line-strong bg-canvas px-3 pr-8 text-ui text-ink outline-none transition-colors duration-150 hover:border-ink/25 focus-visible:border-ink/40 disabled:opacity-40 dark:bg-surface/40",
        className
      )}
      {...props}
    />
  )
}

export function Field({
  label,
  htmlFor,
  help,
  error,
  children,
  className,
}: {
  label: string
  htmlFor: string
  help?: React.ReactNode
  error?: string | null
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-meta text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-micro text-danger" role="alert">
          {error}
        </p>
      ) : (
        help && <p className="text-micro text-ink-3">{help}</p>
      )}
    </div>
  )
}
