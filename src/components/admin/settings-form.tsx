"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { saveSettingsAction } from "@/lib/admin/actions"
import { LIMIT_FIELDS, type LimitKey } from "@/lib/admin/labels"
import { Field, Panel, SectionTitle } from "./primitives"
import { pub } from "@/config/copy"

type Limits = Record<LimitKey, number>

export function SettingsForm({ limits, retentionDays }: { limits: Limits; retentionDays: number }) {
  const [values, setValues] = useState<Record<LimitKey, string>>({
    messages: String(limits.messages),
    audio: String(limits.audio),
    attachments: String(limits.attachments),
    pdfs: String(limits.pdfs),
  })
  const [retention, setRetention] = useState(String(retentionDays))
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const dirty =
    LIMIT_FIELDS.some((f) => Number(values[f.key]) !== limits[f.key]) || Number(retention) !== retentionDays

  function submit() {
    setError(null)
    start(async () => {
      const res = await saveSettingsAction({
        limits: {
          messages: Number(values.messages),
          audio: Number(values.audio),
          attachments: Number(values.attachments),
          pdfs: Number(values.pdfs),
        },
        retentionDays: Number(retention),
      })
      if (!res.ok) return setError(res.error)
      toast.success("Configurações salvas.")
    })
  }

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      noValidate
    >
      <section className="flex flex-col gap-3">
        <SectionTitle
          title={`Limites diários por ${pub.um}`}
          description="Protegem o custo de transcrição, leitura de arquivos e geração de PDF. Use 0 para desligar o recurso."
        />
        <Panel className="grid gap-5 p-4 sm:grid-cols-2 md:p-5">
          {LIMIT_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} htmlFor={`limit-${f.key}`} help={f.help}>
              <Input
                id={`limit-${f.key}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={10000}
                step={1}
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="w-36 tabular-nums"
              />
            </Field>
          ))}
        </Panel>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle
          title="Lixeira"
          description={`Conversas apagadas ficam na lixeira ${pub.do} ${pub.um} e podem ser restauradas. Depois do prazo, a rotina diária remove de vez, com os anexos.`}
        />
        <Panel className="p-4 md:p-5">
          <Field label="Dias na lixeira" htmlFor="retention" help="De 1 a 365 dias.">
            <Input
              id="retention"
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              step={1}
              value={retention}
              onChange={(e) => setRetention(e.target.value)}
              className="w-36 tabular-nums"
            />
          </Field>
        </Panel>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="submit" disabled={pending || !dirty}>
          {pending ? "Salvando..." : "Salvar configurações"}
        </Button>
        {error && (
          <p className="text-ui text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    </form>
  )
}
