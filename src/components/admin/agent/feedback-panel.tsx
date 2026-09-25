"use client"

import { useState } from "react"
import { ArrowBendDownRightIcon, CheckIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/admin/format"
import { EmptyState, SectionTitle } from "../primitives"
import type { AgentDetail } from "./agent-workspace"
import { pub, g } from "@/config/copy"

type Item = AgentDetail["feedback"][number]

/* Respostas com avaliação negativa: a pergunta do usuário, a resposta do agente e o atalho para corrigir. */
export function FeedbackPanel({ feedback, onTransform }: { feedback: Item[]; onTransform: (item: Item) => void }) {
  const pending = feedback.filter((f) => !f.alreadyCorrected).length
  return (
    <section className="flex flex-col gap-4">
      <SectionTitle
        title="Avaliações negativas"
        description={`Respostas deste agente que ${pub.os} ${pub.varios} marcaram como ruins (as 50 mais recentes). Transforme em correção para o agente não repetir o erro.`}
      />
      {feedback.length === 0 ? (
        <EmptyState title="Nenhuma avaliação negativa ainda.">
          Quando {g("um", "uma")} {pub.um} marcar uma resposta como ruim, ela aparece aqui com a pergunta que gerou a resposta.
        </EmptyState>
      ) : (
        <>
          <p className="text-meta font-normal text-ink-2 tabular-nums">
            {pending} sem correção · {feedback.length - pending} já corrigidas
          </p>
          <ul className="flex flex-col gap-3">
            {feedback.map((f) => (
              <FeedbackItem key={f.id} item={f} onTransform={() => onTransform(f)} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function FeedbackItem({ item, onTransform }: { item: Item; onTransform: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const long = item.answer.length > 600
  const answer = long && !expanded ? `${item.answer.slice(0, 600).trimEnd()}...` : item.answer

  return (
    <li className="flex flex-col gap-3 rounded-control border border-line p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-micro text-ink-3">
        <span className="font-medium text-ink-2">{item.userName}</span>
        <span aria-hidden>·</span>
        <span>{formatDateTime(item.createdAt)}</span>
        <span aria-hidden>·</span>
        <span className="truncate">{item.conversationTitle}</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-micro text-ink-3">Pergunta</span>
        {item.question ? (
          <p className="max-w-[80ch] rounded-bubble bg-bubble px-4 py-2.5 text-ui whitespace-pre-wrap text-ink">{item.question}</p>
        ) : (
          <p className="text-ui text-ink-3">A pergunta não foi encontrada (pode ter sido apagada).</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1 text-micro text-ink-3">
          <ArrowBendDownRightIcon className="size-3" />
          Resposta do agente
        </span>
        <p className="max-w-[80ch] text-ui whitespace-pre-wrap text-ink-2">{answer}</p>
        {long && (
          <Button variant="link" size="sm" className="w-fit text-meta" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Mostrar menos" : "Ver resposta inteira"}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-line pt-3">
        {item.alreadyCorrected ? (
          <Badge>
            <CheckIcon />
            Já virou correção
          </Badge>
        ) : (
          <Button variant="secondary" size="sm" onClick={onTransform}>
            Transformar em correção
          </Button>
        )}
      </div>
    </li>
  )
}
