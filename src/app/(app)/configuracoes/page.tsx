import type { Metadata } from "next"
import { requireUser } from "@/lib/auth/session"
import { SettingsView } from "@/components/app/settings"
import { AppHeader, PageBody } from "@/components/shell/app-header"

export const metadata: Metadata = { title: "Configurações" }

export default async function SettingsPage() {
  const { profile } = await requireUser()
  return (
    <>
      <AppHeader title="Configurações" />
      <PageBody>
        <SettingsView name={profile.full_name ?? ""} email={profile.email} isAdmin={profile.role === "admin"} />
      </PageBody>
    </>
  )
}
