"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/shell/theme-toggle"
import { appConfig } from "@/config/app.config"
import { Foundations } from "./foundations"
import { Controls } from "./controls"
import { ChatPatterns } from "./chat-patterns"
import { Section } from "./frame"

const NAV = [
  { id: "identidade", label: "Identidade" },
  { id: "cor", label: "Cor" },
  { id: "tipografia", label: "Tipografia" },
  { id: "espaco", label: "Espaço, raio e elevação" },
  { id: "movimento", label: "Movimento" },
  { id: "icones", label: "Ícones" },
  { id: "layout", label: "Layout" },
  { id: "controles", label: "Controles" },
  { id: "chat", label: "Chat" },
]

const PRINCIPLES = [
  { t: "A conversa é o produto", d: "A interface recua. Sem cor de marca, sem sombra, sem enfeite: o texto do agente é o que aparece." },
  { t: "Hierarquia sem cor", d: "Peso da fonte, véu de hover e posição fazem o trabalho que a cor faria. O cinza tem quatro tons e cada um tem uma função." },
  { t: "Mostrar o trabalho", d: "Pensar, consultar e pedir decisão ficam visíveis, em cinza e acima da resposta, e recolhem quando terminam." },
  { t: "Uma cor, um momento", d: "A varredura arco-íris do modelo Pro é o único instante colorido. Por ser rara, ela marca." },
]

function useActiveSection() {
  const [active, setActive] = useState("identidade")
  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: "-60px 0px -75% 0px" }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return active
}

export function Layout() {
  return (
    <Section
      id="layout"
      title="Layout"
      intro="Duas colunas: a barra lateral de 260px e a conversa, centralizada em até 768px para leitura confortável. No celular a barra vira gaveta sobre um fundo escuro."
    >
      <div className="overflow-x-auto">
        <div className="flex h-80 min-w-[560px] overflow-hidden rounded-2xl border border-line text-micro text-ink-3">
          <div className="flex w-[26%] flex-col border-r border-line bg-rail p-3">
            <span className="font-medium text-ink-2">Barra lateral · 260px</span>
            <div className="mt-4 flex flex-col gap-1.5">
              {[70, 55, 62].map((w) => (
                <div key={w} className="h-2 rounded-full bg-press" style={{ width: `${w}%` }} />
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-1.5">
              {[80, 64, 72, 58].map((w) => (
                <div key={w} className="h-2 rounded-full bg-hover" style={{ width: `${w}%` }} />
              ))}
            </div>
            <span className="mt-auto border-t border-line pt-2">Conta</span>
          </div>
          <div className="flex flex-1 flex-col bg-canvas">
            <div className="flex h-10 items-center border-b border-dashed border-line px-3">Cabeçalho · 52px</div>
            <div className="mx-auto flex w-[70%] flex-1 flex-col gap-3 border-x border-dashed border-line px-3 py-4">
              <span>Conversa · até 768px</span>
              <div className="ml-auto h-6 w-2/5 rounded-[12px] bg-bubble" />
              <div className="flex flex-col gap-1.5">
                {[92, 86, 60].map((w) => (
                  <div key={w} className="h-2 rounded-full bg-hover" style={{ width: `${w}%` }} />
                ))}
              </div>
              <div className="mt-auto flex h-9 items-center rounded-full border border-line px-3">Compositor</div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}

export function DesignSystem() {
  const active = useActiveSection()
  return (
    <div className="flex min-h-dvh bg-canvas">
      <aside className="sticky top-0 hidden h-dvh w-(--rail-w) shrink-0 flex-col border-r border-line bg-rail lg:flex">
        <div className="flex h-(--header-h) items-center px-4.5">
          <span className="text-body font-semibold text-ink">{appConfig.name}</span>
          <span className="ml-2 text-meta text-ink-3">Design System</span>
        </div>
        <nav aria-label="Seções" className="flex flex-col gap-px px-2 pt-2">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              aria-current={active === n.id ? "true" : undefined}
              className={cn(
                "flex h-9 items-center rounded-control px-2.5 text-ui text-ink no-underline transition-colors hover:bg-hover",
                active === n.id && "bg-press hover:bg-press"
              )}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <p className="mt-auto border-t border-line p-4 text-micro text-ink-3">
          Conteúdo dos exemplos é ilustrativo. Troque os tokens em src/app/globals.css.
        </p>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-(--header-h) items-center justify-between bg-canvas px-4 md:px-8 lg:justify-end">
          <span className="text-body font-semibold text-ink lg:hidden">{appConfig.name}</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto flex max-w-[1040px] flex-col gap-12 px-4 pt-6 pb-24 md:px-8">
          <Section
            id="identidade"
            title="Grafite sobre papel"
            intro="O visual do seu Hub de Agentes. O tema de exemplo (Grafite) segue a linguagem do ChatGPT: fundo claro, tinta quase preta, zero cor de marca e controles que somem até você precisar deles. Tudo aqui funciona: passe o mouse, clique, troque o tema no canto superior."
          >
            <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
              {PRINCIPLES.map((p) => (
                <div key={p.t} className="flex flex-col gap-1 border-t border-line pt-4">
                  <h3 className="text-body font-semibold text-ink">{p.t}</h3>
                  <p className="text-ui text-ink-2">{p.d}</p>
                </div>
              ))}
            </div>
          </Section>
          <Foundations />
          <Layout />
          <Controls />
          <ChatPatterns />
        </main>
      </div>
    </div>
  )
}
