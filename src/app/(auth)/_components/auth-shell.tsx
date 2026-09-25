import { appConfig } from "@/config/app.config"

/*
 * Moldura das telas de acesso: coluna estreita e centralizada,
 * marca no topo, título 24/600. Sem cartão nem sombra (Grafite).
 */
export function AuthShell({
  title,
  description,
  children,
}: {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-canvas px-4 pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-[360px] flex-1 flex-col">
        <p className="text-body font-semibold text-ink">{appConfig.name}</p>
        <div className="flex flex-1 flex-col justify-center py-10">
          <h1 className="type-display text-display font-semibold text-ink">{title}</h1>
          {description ? <div className="mt-2 text-ui text-ink-2">{description}</div> : null}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  )
}
