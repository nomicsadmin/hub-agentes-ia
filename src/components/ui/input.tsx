import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 px-3 w-full min-w-0 rounded-control border border-line-strong bg-canvas text-ui text-ink transition-colors duration-150 outline-none placeholder:text-ink-3 hover:border-ink/25 focus-visible:border-ink/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-danger dark:bg-surface/40 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-ui file:font-medium file:text-ink",
        className
      )}
      {...props}
    />
  )
}

export { Input }
