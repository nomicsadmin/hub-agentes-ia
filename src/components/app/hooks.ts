"use client"

import { useCallback, useRef, useSyncExternalStore } from "react"

/* Media query sem piscar na hidratação: no servidor vale `serverValue`. */
export function useMediaQuery(query: string, serverValue = false) {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener("change", cb)
      return () => mq.removeEventListener("change", cb)
    },
    [query]
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue
  )
}

/*
 * Toque longo (celular): chama `onLongPress` depois de 480 ms parado.
 * Se disparar, o clique seguinte é engolido para não abrir o link.
 */
export function useLongPress(onLongPress: () => void, ms = 480) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)

  const clear = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") return
      fired.current = false
      start.current = { x: e.clientX, y: e.clientY }
      clear()
      timer.current = setTimeout(() => {
        fired.current = true
        navigator.vibrate?.(10)
        onLongPress()
      }, ms)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!start.current) return
      if (Math.abs(e.clientX - start.current.x) > 10 || Math.abs(e.clientY - start.current.y) > 10) clear()
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onContextMenu: (e: React.MouseEvent) => {
      // Android abre o menu do navegador no toque longo; o nosso vem no lugar
      if (fired.current || timer.current) e.preventDefault()
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (fired.current) {
        e.preventDefault()
        e.stopPropagation()
        fired.current = false
      }
    },
  }
}
