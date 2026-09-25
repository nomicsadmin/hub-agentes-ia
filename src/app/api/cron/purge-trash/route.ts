import { timingSafeEqual } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { requireSecret } from "@/lib/env.server"
import { createAdminClient } from "@/lib/supabase/server"
import { getTrashRetentionDays, purgeConversations, purgeOrphanUploads } from "@/app/(app)/_lib/purge"

/*
 * GET /api/cron/purge-trash  (Vercel Cron, 1x por dia; ver vercel.json)
 * Protegida por Authorization: Bearer ${CRON_SECRET} (a Vercel envia
 * sozinha quando CRON_SECRET existe no projeto). Apaga as conversas que
 * estão na lixeira há mais de app_settings.trash_retention_days (30) e
 * os arquivos do Storage ligados a elas. Também limpa anexos que
 * subiram mas nunca foram enviados numa mensagem.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

function authorized(request: NextRequest) {
  let secret: string
  try {
    secret = requireSecret("CRON_SECRET")
  } catch {
    return false
  }
  const got = Buffer.from(request.headers.get("authorization") ?? "")
  const want = Buffer.from(`Bearer ${secret}`)
  return got.length === want.length && timingSafeEqual(got, want)
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  try {
    const days = await getTrashRetentionDays()
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()
    const admin = createAdminClient()

    let conversations = 0
    let files = 0
    // em lotes, para não estourar o tempo nem a URL
    for (let round = 0; round < 20; round++) {
      const { data, error } = await admin
        .from("conversations")
        .select("id")
        .not("deleted_at", "is", null)
        .lt("deleted_at", cutoff)
        .limit(200)
      if (error) throw new Error(error.message)
      if (!data?.length) break
      const res = await purgeConversations(data.map((r) => r.id))
      conversations += res.conversations
      files += res.files
      if (data.length < 200) break
    }

    // anexos que subiram e nunca foram enviados (mais de 2 dias)
    const orphans = await purgeOrphanUploads(new Date(Date.now() - 2 * 86_400_000).toISOString())

    return NextResponse.json({ ok: true, retentionDays: days, conversations, files, orphans })
  } catch (e) {
    console.error("[cron/purge-trash] falha:", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "Falha ao limpar a lixeira." }, { status: 500 })
  }
}
