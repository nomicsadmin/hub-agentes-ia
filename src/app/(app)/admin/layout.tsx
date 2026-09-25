import type { Metadata } from "next"
import { requireAdmin } from "@/lib/auth/session"
import { AdminNav } from "@/components/admin/admin-nav"
import { AppHeader } from "@/components/shell/app-header"

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
}

/*
 * Admin: só quem tem papel admin e acesso ativo. Cada página também
 * chama requireAdmin(), porque layout e página renderizam em paralelo.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return (
    <div className="flex h-full flex-col bg-canvas">
      {/* no celular, o ☰ abre a barra lateral */}
      <AppHeader title="Admin" className="md:hidden" />
      <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 pt-4 pb-24 md:px-8 md:pt-6">
        <div className="flex flex-col gap-3 border-b border-line pb-3">
          <span className="text-meta text-ink-3">Admin</span>
          <AdminNav />
        </div>
        {children}
      </div>
      </div>
    </div>
  )
}
