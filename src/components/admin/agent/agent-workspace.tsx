"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { getAgentDetail } from "@/lib/admin/data"
import { PromptPanel } from "./prompt-panel"
import { CorrectionsPanel, type CorrectionDraft } from "./corrections-panel"
import { DocumentsPanel } from "./documents-panel"
import { FeedbackPanel } from "./feedback-panel"

export type AgentDetail = NonNullable<Awaited<ReturnType<typeof getAgentDetail>>>
export type AgentTab = "prompt" | "correcoes" | "documentos" | "avaliacoes"

/* Abas do agente. A aba fica na URL (?aba=) para poder linkar direto. */
export function AgentWorkspace({ detail, initialTab }: { detail: AgentDetail; initialTab: AgentTab }) {
  const [tab, setTab] = useState<AgentTab>(initialTab)
  const [draft, setDraft] = useState<CorrectionDraft | null>(null)

  function changeTab(next: AgentTab) {
    setTab(next)
    const url = new URL(window.location.href)
    if (next === "prompt") url.searchParams.delete("aba")
    else url.searchParams.set("aba", next)
    window.history.replaceState(null, "", url)
  }

  const pendingFeedback = detail.feedback.filter((f) => !f.alreadyCorrected).length
  const activeCorrections = detail.corrections.filter((c) => c.isActive).length

  return (
    <Tabs value={tab} onValueChange={(value) => changeTab(value as AgentTab)} className="gap-5">
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <TabsList>
          <TabsTrigger value="prompt">Prompt</TabsTrigger>
          <TabsTrigger value="correcoes">
            Correções
            {activeCorrections > 0 && <span className="text-micro text-ink-3 tabular-nums">{activeCorrections}</span>}
          </TabsTrigger>
          <TabsTrigger value="documentos">
            Documentos
            {detail.documents.length > 0 && (
              <span className="text-micro text-ink-3 tabular-nums">{detail.documents.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="avaliacoes">
            Avaliações
            {pendingFeedback > 0 && <span className="text-micro text-ink-3 tabular-nums">{pendingFeedback}</span>}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="prompt">
        <PromptPanel agentId={detail.agent.id} versions={detail.versions} />
      </TabsContent>
      <TabsContent value="correcoes">
        <CorrectionsPanel
          agentId={detail.agent.id}
          corrections={detail.corrections}
          draft={draft}
          onDraftDone={() => setDraft(null)}
        />
      </TabsContent>
      <TabsContent value="documentos">
        <DocumentsPanel
          agentId={detail.agent.id}
          documents={detail.documents}
          available={detail.available}
          totalTokens={detail.totalTokens}
          tokenLimit={detail.tokenLimit}
        />
      </TabsContent>
      <TabsContent value="avaliacoes">
        <FeedbackPanel
          feedback={detail.feedback}
          onTransform={(item) => {
            setDraft({
              question: item.questionSummary || item.question || "",
              sourceMessageId: item.id,
              nonce: Date.now(),
            })
            changeTab("correcoes")
          }}
        />
      </TabsContent>
    </Tabs>
  )
}
