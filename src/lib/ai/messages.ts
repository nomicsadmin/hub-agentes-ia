import "server-only"
import { createAdminClient } from "@/lib/supabase/server"

/*
 * Apaga uma resposta do agente e os PDFs que ela gerou (arquivo no
 * Storage + linha em message_attachments, que cai em cascata).
 * Só chamar depois de conferir que a conversa é do usuário.
 */
export async function deleteAssistantMessage(messageId: string) {
  const admin = createAdminClient()
  const { data: atts } = await admin
    .from("message_attachments")
    .select("storage_path")
    .eq("message_id", messageId)
    .eq("kind", "generated_pdf")
  const paths = (atts ?? []).map((a) => a.storage_path)
  if (paths.length) await admin.storage.from("generated").remove(paths)
  await admin.from("messages").delete().eq("id", messageId).eq("role", "assistant")
}
