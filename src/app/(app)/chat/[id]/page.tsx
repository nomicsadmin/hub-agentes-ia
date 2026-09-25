import type { Metadata } from "next"
import { cache } from "react"
import { notFound } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ChatView } from "@/components/app/chat-view"
import { toStarters, type AttachmentKind, type UiMessage } from "@/components/app/types"
import { CONVERSATION_FIELDS, getAgents } from "../../_lib/queries"
import { withBase } from "@/lib/base-path"

const getConversation = cache(async (id: string) => {
  if (!z.string().uuid().safeParse(id).success) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from("conversations")
    .select(`${CONVERSATION_FIELDS}, agents(id, slug, name, description, icon, starters)`)
    .eq("id", id)
    .maybeSingle()
  return data
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const conv = await getConversation(id)
  return { title: conv?.title ?? "Conversa" }
}

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const conv = await getConversation(id)
  if (!conv) notFound()

  const supabase = await createClient()
  const [{ data: rows }, agents] = await Promise.all([
    supabase
      .from("messages")
      .select("id, role, content, status, feedback, created_at, message_attachments(id, kind, title, mime, transcript)")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(500),
    getAgents(),
  ])

  // anexos abrem por /api/pdf/[id], que redireciona para uma URL assinada e curta
  const messages: UiMessage[] = (rows ?? []).map((m) => ({
    id: m.id,
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
    status: m.status,
    feedback: m.feedback,
    createdAt: m.created_at,
    attachments: (m.message_attachments ?? []).map((a) => ({
      id: a.id,
      kind: a.kind as AttachmentKind,
      title: a.title,
      mime: a.mime,
      transcript: a.transcript,
      url: withBase(`/api/pdf/${a.id}`),
    })),
  }))

  const joined = conv.agents
  const agent = joined
    ? { ...joined, starters: toStarters(joined.starters) }
    : (agents.find((a) => a.id === conv.agent_id) ?? {
        id: conv.agent_id,
        slug: "",
        name: "Agente",
        description: "",
        icon: "robot",
        starters: [],
      })

  return (
    <ChatView
      key={conv.id}
      conversationId={conv.id}
      conversation={{
        id: conv.id,
        title: conv.title,
        pinned: conv.pinned,
        folder_id: conv.folder_id,
        archived_at: conv.archived_at,
        deleted_at: conv.deleted_at,
      }}
      agent={agent}
      agents={agents}
      initialMessages={messages}
    />
  )
}
