import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/*
 * Botões: raio de 10px em todos os tamanhos; a pílula só existe
 * como forma explícita (shape="pill") para ações de conta e chips.
 * Não há cor de marca: o primário é tinta sólida.
 */
const buttonVariants = cva(
  "group/button type-label inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium outline-none select-none transition-[background-color,border-color,color,transform,opacity] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus) enabled:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "fill-primary hover:opacity-85",
        secondary:
          "border border-line bg-surface text-ink hover:border-line-strong hover:bg-hover aria-expanded:bg-hover",
        ghost: "text-ink hover:bg-hover aria-expanded:bg-hover data-popup-open:bg-hover",
        quiet: "text-ink-2 hover:bg-hover hover:text-ink aria-expanded:bg-hover aria-expanded:text-ink data-popup-open:bg-hover data-popup-open:text-ink",
        danger: "bg-danger text-ink-inverse hover:bg-danger/90 dark:text-ink-inverse",
        link: "h-auto! px-0! text-ink underline underline-offset-4 decoration-line-strong hover:decoration-ink",
      },
      size: {
        sm: "h-8 rounded-control px-3 text-ui [&_svg:not([class*='size-'])]:size-4",
        md: "h-9 rounded-control px-3.5 text-ui [&_svg:not([class*='size-'])]:size-[18px]",
        lg: "h-11 rounded-control px-5 text-body [&_svg:not([class*='size-'])]:size-5",
        "icon-sm": "size-8 rounded-control [&_svg:not([class*='size-'])]:size-[18px]",
        icon: "size-9 rounded-control [&_svg:not([class*='size-'])]:size-5",
      },
      shape: {
        default: "",
        pill: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      shape: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  shape,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, shape, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
