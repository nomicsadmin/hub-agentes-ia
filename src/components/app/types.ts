/* Tipos da interface do app (dados já vindos do Supabase, prontos para a tela). */

export type AgentInfo = {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  starters: string[]
}

export type ConversationSummary = {
  id: string
  title: string
  agent_id: string
  pinned: boolean
  folder_id: string | null
  archived_at: string | null
  deleted_at: string | null
  updated_at: string
}

export type Folder = { id: string; name: string }
export type Tag = { id: string; name: string }

export type AttachmentKind = "audio" | "image" | "pdf" | "generated_pdf"

export type UiAttachment = {
  id: string
  kind: AttachmentKind
  title: string | null
  mime?: string | null
  /** para abrir/baixar: URL assinada (áudio, imagem) ou rota do app (PDF) */
  url?: string | null
  transcript?: string | null
}

export type UiMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  status: string
  feedback: number | null
  createdAt: string
  attachments: UiAttachment[]
}

export type ProfileInfo = {
  id: string
  email: string
  fullName: string | null
  role: string
}

/* agents.starters é jsonb: aceita só strings */
export function toStarters(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0) : []
}
