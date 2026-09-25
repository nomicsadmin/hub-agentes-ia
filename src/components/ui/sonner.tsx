"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircleIcon, InfoIcon, WarningIcon, WarningOctagonIcon, CircleNotchIcon } from "@phosphor-icons/react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const sonnerTheme = theme as ToasterProps["theme"]

  return (
    <Sonner
      theme={sonnerTheme}
      className="toaster group"
      icons={{
        success: (
          <CheckCircleIcon className="size-[18px]" />
        ),
        info: (
          <InfoIcon className="size-[18px]" />
        ),
        warning: (
          <WarningIcon className="size-[18px]" />
        ),
        error: (
          <WarningOctagonIcon className="size-[18px]" />
        ),
        loading: (
          <CircleNotchIcon className="size-[18px] animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--ink)",
          "--normal-text": "var(--ink-inverse)",
          "--normal-border": "transparent",
          "--border-radius": "10px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast !text-ui !font-medium !shadow-none",
          actionButton: "!bg-ink-inverse !text-ink !rounded-md !font-medium",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
