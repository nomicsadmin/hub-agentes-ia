import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 px-3 py-2.5 leading-5 w-full min-w-0 rounded-control border border-line-strong bg-canvas text-ui text-ink transition-colors duration-150 outline-none placeholder:text-ink-3 hover:border-ink/25 focus-visible:border-ink/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-danger dark:bg-surface/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
