import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { appConfig } from "@/config/app.config"
import { helpPrompt, runChecks, type Check } from "@/lib/setup/checks"
import { setupAllowed } from "@/lib/setup/guard"
import { SetupActions, CopyHelp } from "./setup-client"

export const metadata: Metadata = { title: "Instalação" }
export const dynamic = "force-dynamic"

const STEPS = [
  { n: 1, title: "Baixar o projeto" },
  { n: 2, title: "Contas e ferramentas" },
  { n: 3, title: "Supabase (banco e login)" },
  { n: 4, title: "OpenAI (inteligência)" },
  { n: 5, title: "Rodar e criar o admin" },
  { n: 6, title: "Seu design" },
  { n: 7, title: "Seus agentes" },
  { n: 8, title: "Publicar" },
]

const ICON: Record<Check["status"], string> = { ok: "✓", fail: "✕", warn: "!", skip: "–" }
const TONE: Record<Check["status"], string> = {
  ok: "bg-ink text-ink-inverse",
  fail: "bg-danger text-ink-inverse",
  warn: "border border-ink-2 text-ink",
  skip: "border border-line text-ink-3",
}
const LABEL: Record<Check["status"], string> = { ok: "Pronto", fail: "Falta resolver", warn: "Atenção", skip: "Opcional" }

export default async function SetupPage() {
  if (!(await setupAllowed())) notFound()
  const checks = await runChecks()
  const blocking = checks.filter((c) => c.status === "fail")
  const done = blocking.length === 0

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col gap-8 px-4 py-10 md:px-6 md:py-16">
      <header className="flex flex-col gap-3">
        <p className="text-meta text-ink-3">{appConfig.name} · assistente de instalação</p>
        <h1 className="text-h2 font-semibold text-ink">
          {done ? "Tudo pronto. Seu hub está funcionando." : `Faltam ${blocking.length} ${blocking.length === 1 ? "item" : "itens"} para o seu hub funcionar`}
        </h1>
        <p className="text-body text-ink-2">
          Cada linha abaixo é conferida ao vivo. Resolva de cima para baixo e clique em <strong>Verificar de novo</strong>.
          Travou? Use o botão <strong>Pedir ajuda para a IA</strong>: ele copia um pedido pronto, sem nenhuma chave.
        </p>
        <SetupActions done={done} />
      </header>

      <ol className="flex flex-col gap-6">
        {STEPS.map((step) => {
          const items = checks.filter((c) => c.step === step.n)
          const manual = step.n === 1 || step.n === 6
          return (
            <li key={step.n} className="flex flex-col gap-3">
              <h2 className="text-body font-semibold text-ink">
                Passo {step.n} · {step.title}
              </h2>
              {items.length === 0 ? (
                <p className="rounded-control border border-line px-4 py-3 text-meta text-ink-2">
                  {manual
                    ? step.n === 1
                      ? "Feito: você está vendo esta página."
                      : "Troque os tokens em src/app/globals.css e o nome em src/config/app.config.ts. Confira em /design-system."
                    : "Aparece depois que o passo anterior estiver pronto."}
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-line rounded-control border border-line">
                  {items.map((c) => (
                    <li key={c.id} className="flex flex-col gap-2 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden
                          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${TONE[c.status]}`}
                        >
                          {ICON[c.status]}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <p className="text-body font-medium text-ink">
                            {c.title} <span className="sr-only">({LABEL[c.status]})</span>
                          </p>
                          <p className="text-meta break-words text-ink-2">{c.detail}</p>
                          {c.fix && (c.status === "fail" || c.status === "warn") && (
                            <p className="text-meta break-words text-ink">
                              <span className="font-medium">Como resolver: </span>
                              {c.fix}
                            </p>
                          )}
                          {c.doc && (c.status === "fail" || c.status === "warn") && (
                            <p className="text-meta text-ink-3">Guia: {c.doc}</p>
                          )}
                        </div>
                      </div>
                      {c.status === "fail" && <CopyHelp text={helpPrompt(c)} />}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ol>

      <footer className="border-t border-line pt-6 text-meta text-ink-3">
        Esta página só existe durante a instalação: em produção ela some quando o primeiro admin é criado. Nenhum valor de
        chave é mostrado aqui.
      </footer>
    </main>
  )
}
