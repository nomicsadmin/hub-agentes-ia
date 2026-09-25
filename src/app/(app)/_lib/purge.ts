import "server-only"
import { createAdminClient } from "@/lib/supabase/server"

/*
 * APAGAR CONVERSAS DE VEZ (lixeira manual e automática)
 * Apaga os arquivos do Storage ligados às mensagens e depois as
 * conversas (mensagens e anexos caem em cascata no banco).
 * Usa a service role: quem chama já conferiu o dono (ação) ou o
 * segredo do cron.
 */

const BUCKETS = ["chat-uploads", "generated"] as const

/* PDF gerado fica em "generated"; o resto em "chat-uploads". Aceita caminho com o bucket na frente. */
export function storageLocation(kind: string, storagePath: string): { bucket: string; path: string } {
  for (const b of BUCKETS) {
    if (storagePath.startsWith(`${b}/`)) return { bucket: b, path: storagePath.slice(b.length + 1) }
  }
  return { bucket: kind === "generated_pdf" ? "generated" : "chat-uploads", path: storagePath }
}

export async function purgeConversations(conversationIds: string[]) {
  if (conversationIds.length === 0) return { conversations: 0, files: 0 }
  const admin = createAdminClient()
  let files = 0

  for (let i = 0; i < conversationIds.length; i += 100) {
    const ids = conversationIds.slice(i, i + 100)

    const { data: attachments, error: attError } = await admin
      .from("message_attachments")
      .select("kind, storage_path, messages!inner(conversation_id)")
      .in("messages.conversation_id", ids)
    if (attError) throw new Error(`anexos: ${attError.message}`)

    const byBucket = new Map<string, string[]>()
    for (const a of attachments ?? []) {
      const { bucket, path } = storageLocation(a.kind, a.storage_path)
      byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), path])
    }
    for (const [bucket, paths] of byBucket) {
      for (let j = 0; j < paths.length; j += 500) {
        const chunk = paths.slice(j, j + 500)
        const { error } = await admin.storage.from(bucket).remove(chunk)
        if (error) throw new Error(`storage ${bucket}: ${error.message}`)
        files += chunk.length
      }
    }

    const { error: delError } = await admin.from("conversations").delete().in("id", ids)
    if (delError) throw new Error(`conversas: ${delError.message}`)
  }

  return { conversations: conversationIds.length, files }
}

/* Dias que a lixeira guarda (app_settings.trash_retention_days, padrão 30). */
export async function getTrashRetentionDays() {
  const admin = createAdminClient()
  const { data } = await admin.from("app_settings").select("value").eq("key", "trash_retention_days").maybeSingle()
  const n = Number(data?.value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30
}

/*
 * Anexos que subiram mas nunca foram enviados numa mensagem
 * (o usuário removeu a prévia ou fechou o app). Some depois de 2 dias.
 */
export async function purgeOrphanUploads(olderThanIso: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("message_attachments")
    .select("id, kind, storage_path")
    .is("message_id", null)
    .lt("created_at", olderThanIso)
    .limit(500)
  if (error) throw new Error(`anexos soltos: ${error.message}`)
  if (!data?.length) return 0
  const byBucket = new Map<string, string[]>()
  for (const a of data) {
    const { bucket, path } = storageLocation(a.kind, a.storage_path)
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), path])
  }
  for (const [bucket, paths] of byBucket) {
    const { error: rmError } = await admin.storage.from(bucket).remove(paths)
    if (rmError) throw new Error(`storage ${bucket}: ${rmError.message}`)
  }
  const { error: delError } = await admin.from("message_attachments").delete().in("id", data.map((a) => a.id))
  if (delError) throw new Error(`anexos soltos: ${delError.message}`)
  return data.length
}
