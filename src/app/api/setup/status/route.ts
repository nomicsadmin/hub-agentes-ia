import { runChecks } from "@/lib/setup/checks"
import { setupAllowed } from "@/lib/setup/guard"

/* Estado da instalação em JSON (sem segredos). Some junto com o /setup. */
export const dynamic = "force-dynamic"

export async function GET() {
  if (!(await setupAllowed())) return new Response("Not Found", { status: 404 })
  const checks = await runChecks()
  return Response.json({ checks }, { headers: { "Cache-Control": "no-store" } })
}
