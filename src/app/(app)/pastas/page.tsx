import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { FoldersView, NewFolderButton } from "@/components/app/folders"
import { AppHeader, PageBody } from "@/components/shell/app-header"

export const metadata: Metadata = { title: "Pastas" }

export default async function FoldersPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("folders")
    .select("id, name, conversations(count)")
    .is("conversations.deleted_at", null)
    .order("name")
  const folders = (data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    count: (f.conversations as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
  }))
  return (
    <>
      <AppHeader title="Pastas" actions={folders.length > 0 ? <NewFolderButton /> : undefined} />
      <PageBody>
        <FoldersView folders={folders} />
      </PageBody>
    </>
  )
}
