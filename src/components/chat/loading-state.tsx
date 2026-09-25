"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────────────────────
 * LOADING STATE: grade de pixels para trabalho demorado
 * Adaptado de beautifului.dev (Loading State).
 *
 *   Drive: células quadradas, frente em chevron para a direita;
 *          o ciclo de 650ms é menor que a varredura, então
 *          sempre há duas frentes em movimento
 *   Dots:  a mesma frente, células redondas
 *   Orbit: um cometa contornando a grade
 *
 * Acompanha um rótulo com brilho e um cronômetro em dígitos
 * tabulares. Com movimento reduzido a grade congela no estado
 * apagado; o cronômetro continua.
 * ───────────────────────────────────────────────────────── */

const chevron = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3)
  const c = i % 3
  return (c + Math.abs(r - 1)) * 90
})

const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3]
const orbit = Array.from({ length: 9 }, (_, i) => {
  const k = ORBIT_ORDER.indexOf(i)
  return k === -1 ? null : k * 110
})

export type LoaderVariant = "drive" | "dots" | "orbit"

const PATTERNS: Record<LoaderVariant, { delays: (number | null)[]; dur: number; round: boolean }> = {
  drive: { delays: chevron, dur: 650, round: false },
  dots: { delays: chevron, dur: 650, round: true },
  orbit: { delays: orbit, dur: 950, round: false },
}

export function LoaderGrid({ variant = "drive" }: { variant?: LoaderVariant }) {
  const { delays, dur, round } = PATTERNS[variant]
  return (
    <span aria-hidden className="grid shrink-0 grid-cols-[repeat(3,4px)] gap-[1.5px]">
      {delays.map((delay, index) => (
        <span
          key={index}
          className={cn("size-1 bg-signal", round ? "rounded-full" : "rounded-[1px]")}
          style={{
            opacity: delay === null ? 0.07 : 0.15,
            animation: delay === null ? "none" : `pixel-on ${dur}ms ease-in-out ${delay}ms infinite`,
          }}
        />
      ))}
    </span>
  )
}

/* "4,2 s" / "1 min 4,2 s": decimal com vírgula, como se lê em pt-BR */
export function formatElapsed(seconds: number) {
  const fmt = (n: number) => n.toFixed(1).replace(".", ",")
  if (seconds < 60) return `${fmt(seconds)} s`
  return `${Math.floor(seconds / 60)} min ${fmt(seconds % 60)} s`
}

function useElapsed(running: boolean) {
  const [tenths, setTenths] = useState(0)
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setTenths((d) => d + 1), 100)
    return () => clearInterval(t)
  }, [running])
  return tenths / 10
}

export function ShimmerText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn("bg-clip-text text-meta font-medium text-transparent", className)}
      style={{
        backgroundImage: "linear-gradient(90deg, var(--ink-3) 35%, var(--highlight) 50%, var(--ink-3) 65%)",
        backgroundSize: "200% 100%",
        animation: "shimmer-text 1.4s linear infinite",
      }}
    >
      {children}
    </span>
  )
}

export function LoadingState({
  label = "Pensando",
  variant = "drive",
  showTimer = true,
  className,
}: {
  label?: string
  variant?: LoaderVariant
  showTimer?: boolean
  className?: string
}) {
  const elapsed = useElapsed(showTimer)
  return (
    <div role="status" aria-live="polite" className={cn("flex w-fit items-center gap-2.5", className)}>
      <LoaderGrid variant={variant} />
      <ShimmerText>{label}</ShimmerText>
      {showTimer && (
        <span className="font-mono text-micro text-ink-3 tabular-nums" aria-hidden>
          {formatElapsed(elapsed)}
        </span>
      )}
    </div>
  )
}
