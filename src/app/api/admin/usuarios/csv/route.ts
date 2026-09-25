import { adminRouteGuard, jsonError } from "@/lib/admin/guard"
import { listUsers } from "@/lib/admin/data"
import { applyUserQuery, parseUserQuery } from "@/lib/admin/users"
import { csvResponse, toCsv } from "@/lib/admin/csv"
import { formatDateTime, spDayKey } from "@/lib/admin/format"
import { ACCESS_STATUS_LABEL, ROLE_LABEL, purchaseLabel } from "@/lib/admin/labels"
import { pub } from "@/config/copy"

/* GET /api/admin/usuarios/csv?q=&filtro=&ordem= (mesmos filtros da tabela) */
export async function GET(request: Request) {
  const guard = await adminRouteGuard()
  if ("response" in guard) return guard.response

  try {
    const params = Object.fromEntries(new URL(request.url).searchParams)
    const rows = applyUserQuery(await listUsers(), parseUserQuery(params))
    const csv = toCsv(
      ["Nome", "E-mail", "Último acesso", "Acessos", "Mensagens", "Compra", "Acesso", "Papel", "Cadastro"],
      rows.map((r) => [
        r.name ?? "",
        r.email,
        r.lastSeenAt ? formatDateTime(r.lastSeenAt) : "Nunca",
        r.accessCount,
        r.messageCount,
        purchaseLabel(r.purchaseStatus),
        ACCESS_STATUS_LABEL[r.status] ?? r.status,
        ROLE_LABEL[r.role] ?? r.role,
        formatDateTime(r.createdAt),
      ])
    )
    return csvResponse(`${pub.varios}-${spDayKey(new Date())}.csv`, csv)
  } catch (err) {
    console.error("[admin/usuarios/csv]", err)
    return jsonError("Não foi possível gerar o CSV. Tente de novo.", 500)
  }
}
