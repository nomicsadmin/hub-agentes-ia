"use client"

import { useState } from "react"
import { CheckIcon, CopyIcon } from "@phosphor-icons/react"

/* Bloco de código: sem realce colorido (a interface é acromática).
 * Comentários ficam em cinza; o resto em tinta. */
export function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="overflow-hidden rounded-control border border-line bg-rail dark:bg-[#171717]">
      <div className="flex h-9 items-center justify-between border-b border-line pr-1.5 pl-3.5">
        <span className="text-micro font-medium text-ink-2">{language}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(code).catch(() => {})
            setCopied(true)
            setTimeout(() => setCopied(false), 1600)
          }}
          className="flex h-7 items-center gap-1.5 rounded-md px-2 text-micro font-medium text-ink-2 transition-colors hover:bg-hover hover:text-ink"
        >
          {copied ? <CheckIcon weight="bold" className="size-3.5" /> : <CopyIcon className="size-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-5 text-ink">
        <code>
          {code.split("\n").map((line, i) => (
            <span key={i} className={line.trim().startsWith("//") || line.trim().startsWith("#") ? "text-ink-3" : undefined}>
              {line}
              {"\n"}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}
