import { requireAdmin } from "@/lib/auth/session"
import { getSettings } from "@/lib/admin/data"
import { formatDateTime } from "@/lib/admin/format"
import { PageHeader } from "@/components/admin/primitives"
import { SettingsForm } from "@/components/admin/settings-form"
import { pub, g } from "@/config/copy"

export default async function AdminSettingsPage() {
  await requireAdmin()
  const settings = await getSettings()
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configurações"
        description={
          settings.updatedAt
            ? `Valem para ${g("todos os", "todas as")} ${pub.varios} a partir da próxima ação. Última mudança em ${formatDateTime(settings.updatedAt)}.`
            : `Valem para ${g("todos os", "todas as")} ${pub.varios} a partir da próxima ação.`
        }
      />
      <SettingsForm
        key={settings.updatedAt ?? "padrao"}
        limits={settings.limits}
        retentionDays={settings.retentionDays}
      />
    </div>
  )
}
