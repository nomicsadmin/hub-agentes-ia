"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

/* Ligado = tinta sólida; desligado = trilho cinza. Sem cor de marca. */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer group/switch relative inline-flex h-5 w-8 shrink-0 items-center rounded-full p-0.5 outline-none transition-colors duration-150 after:absolute after:-inset-x-2 after:-inset-y-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus) data-checked:bg-signal data-unchecked:bg-edge data-disabled:cursor-not-allowed data-disabled:opacity-40 dark:data-unchecked:bg-ink-4",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 rounded-full bg-white transition-transform duration-200 ease-out data-checked:translate-x-3 data-checked:bg-signal-ink"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
