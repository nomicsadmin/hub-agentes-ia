"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { PlusIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { saveTopicAction } from "@/lib/admin/actions"
import { cn } from "@/lib/utils"
import { DataTable, EmptyState, Td, Th, Tr } from "./primitives"

type Topic = { id: string; name: string; sort: number; is_active: boolean }

/*
 * Lista fixa de temas usada pela classificação das mensagens.
 * Renomear leva junto o histórico; desativar tira o tema das
 * próximas classificações sem apagar o que já foi contado.
 */
export function TopicsEditor({ topics }: { topics: Topic[] }) {
  const nextSort = Math.min(999, Math.max(0, ...topics.filter((t) => t.sort < 99).map((t) => t.sort)) + 1)
  return (
    <div className="flex flex-col gap-3">
      {topics.length === 0 ? (
        <EmptyState title="Nenhum tema cadastrado.">
          Adicione os temas abaixo. Sem lista, a classificação das mensagens não tem onde encaixar as perguntas.
        </EmptyState>
      ) : (
        <DataTable minWidth={560} label="Lista de temas">
          <thead>
            <tr>
              <Th className="w-24">Ordem</Th>
              <Th>Nome</Th>
              <Th className="w-36">Ativo</Th>
              <Th>
                <span className="sr-only">Salvar</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => (
              <TopicRow key={`${t.id}-${t.name}-${t.sort}-${t.is_active}`} topic={t} />
            ))}
          </tbody>
        </DataTable>
      )}
      <NewTopic defaultSort={nextSort} />
    </div>
  )
}

function TopicRow({ topic }: { topic: Topic }) {
  const [name, setName] = useState(topic.name)
  const [sort, setSort] = useState(String(topic.sort))
  const [active, setActive] = useState(topic.is_active)
  const [pending, start] = useTransition()
  const dirty = name.trim() !== topic.name || Number(sort) !== topic.sort || active !== topic.is_active

  function save() {
    start(async () => {
      const res = await saveTopicAction({ id: topic.id, name, sort: Number(sort), isActive: active })
      if (!res.ok) toast.error(res.error)
      else
        toast.success(
          name.trim() !== topic.name ? "Tema renomeado. O histórico foi atualizado junto." : "Tema salvo."
        )
    })
  }

  return (
    <Tr className={cn(!active && "text-ink-3")}>
      <Td>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          max={999}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label={`Ordem de ${topic.name}`}
          className="h-8 w-20 tabular-nums"
        />
      </Td>
      <Td>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          aria-label={`Nome do tema ${topic.name}`}
          className="h-8"
        />
      </Td>
      <Td>
        <label className="flex items-center gap-2 text-meta font-normal text-ink-2">
          <Switch checked={active} onCheckedChange={setActive} aria-label={`${topic.name} ativo`} />
          {active ? "Ativo" : "Inativo"}
        </label>
      </Td>
      <Td align="right">
        <Button size="sm" variant={dirty ? "primary" : "quiet"} disabled={!dirty || pending} onClick={save}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </Td>
    </Tr>
  )
}

function NewTopic({ defaultSort }: { defaultSort: number }) {
  const [name, setName] = useState("")
  const [pending, start] = useTransition()
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await saveTopicAction({ name, sort: defaultSort, isActive: true })
          if (!res.ok) return void toast.error(res.error)
          toast.success("Tema adicionado.")
          setName("")
        })
      }}
    >
      <label className="flex-1">
        <span className="sr-only">Nome do novo tema</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Nome do novo tema" />
      </label>
      <Button type="submit" variant="secondary" disabled={pending || name.trim().length < 2}>
        <PlusIcon />
        {pending ? "Adicionando..." : "Adicionar tema"}
      </Button>
    </form>
  )
}
