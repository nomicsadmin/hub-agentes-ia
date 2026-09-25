"use client"

import { useState } from "react"
import {
  ArchiveIcon,
  ExportIcon,
  NotePencilIcon,
  PencilSimpleIcon,
  PushPinIcon,
  TrashIcon,
  CaretDownIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Tip } from "@/components/ui/tooltip"
import { Block, Section, Stage } from "./frame"

function Field({
  id,
  label,
  help,
  error,
  children,
}: {
  id: string
  label: string
  help?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-ui font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="text-meta text-danger">
          {error}
        </p>
      ) : help ? (
        <p id={`${id}-msg`} className="text-meta text-ink-3">
          {help}
        </p>
      ) : null}
    </div>
  )
}

const COPY = {
  grafite: {
    intro: "Poucos controles, pequenos e quase sem moldura, para a conversa dominar. O primário é tinta sólida; não existe botão colorido.",
    buttons: "Raio de 10px. A pílula só aparece como forma explícita, em ações de conta e chips.",
    choices: "Interruptor ligado é tinta sólida. O controle segmentado tem um único destaque que desliza.",
    dialog: "Fundo escuro de 50%, sem desfoque. O aviso é tinta invertida e confirma com o mesmo verbo da ação.",
  },
}

export function Controls({ v = "grafite" }: { v?: keyof typeof COPY }) {
  const copy = COPY[v]
  const [memory, setMemory] = useState(true)
  const [web, setWeb] = useState(false)

  return (
    <Section
      id="controles"
      title="Controles"
      intro={copy.intro}
    >
      <Block title="Botões" note={copy.buttons}>
        <Stage className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Criar agente</Button>
            <Button variant="secondary">Cancelar</Button>
            <Button variant="ghost">
              <ExportIcon />
              Compartilhar
            </Button>
            <Button variant="quiet">Ver todos</Button>
            <Button variant="danger">Excluir conversa</Button>
            <Button variant="link">Saiba mais</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Pequeno</Button>
            <Button size="md">Médio</Button>
            <Button size="lg">Grande</Button>
            <Button shape="pill" variant="secondary">
              Entrar
            </Button>
            <Button disabled>Desabilitado</Button>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Tip label="Novo chat" shortcut={<Kbd>⇧⌘O</Kbd>}>
              <Button variant="quiet" size="icon" aria-label="Novo chat">
                <NotePencilIcon />
              </Button>
            </Tip>
            <Tip label="Editar">
              <Button variant="quiet" size="icon" aria-label="Editar">
                <PencilSimpleIcon />
              </Button>
            </Tip>
            <Tip label="Arquivar">
              <Button variant="quiet" size="icon" aria-label="Arquivar">
                <ArchiveIcon />
              </Button>
            </Tip>
            <span className="ml-3 text-meta text-ink-3">Passe o mouse para ver a dica</span>
          </div>
        </Stage>
      </Block>

      <div className="grid gap-12 lg:grid-cols-2">
        <Block title="Campos" note="Rótulo sempre acima, ajuda ou erro embaixo. O placeholder nunca substitui o rótulo.">
          <Stage className="flex flex-col gap-5">
            <Field id="agent-name" label="Nome do agente" help="Aparece na barra lateral e no topo da conversa.">
              <Input id="agent-name" defaultValue="Copywriter" aria-describedby="agent-name-msg" />
            </Field>
            <Field id="agent-mail" label="E-mail para relatórios" error="Falta o @. Use o formato nome@empresa.com.">
              <Input id="agent-mail" defaultValue="nome.exemplo.com" aria-invalid aria-describedby="agent-mail-msg" />
            </Field>
            <Field id="agent-brief" label="Instruções" help="Como o agente deve responder.">
              <Textarea id="agent-brief" placeholder="Ex.: responda em tópicos curtos e sempre termine com uma pergunta" />
            </Field>
          </Stage>
        </Block>

        <Block title="Escolhas" note={copy.choices}>
          <Stage className="flex flex-col gap-6">
            <label className="flex items-center justify-between gap-4">
              <span className="flex flex-col">
                <span className="text-ui font-medium text-ink">Memória entre conversas</span>
                <span className="text-meta text-ink-3">O agente lembra do que você já contou.</span>
              </span>
              <Switch checked={memory} onCheckedChange={setMemory} />
            </label>
            <label className="flex items-center justify-between gap-4">
              <span className="flex flex-col">
                <span className="text-ui font-medium text-ink">Busca na web</span>
                <span className="text-meta text-ink-3">Consulta informações atuais antes de responder.</span>
              </span>
              <Switch checked={web} onCheckedChange={setWeb} />
            </label>
            <Tabs defaultValue="todos">
              <TabsList>
                <TabsTrigger value="todos">Todos</TabsTrigger>
                <TabsTrigger value="fixados">Fixados</TabsTrigger>
                <TabsTrigger value="arquivados">Arquivados</TabsTrigger>
              </TabsList>
            </Tabs>
          </Stage>
        </Block>
      </div>

      <div className="grid gap-12 lg:grid-cols-2">
        <Block title="Menu" note="Abre a partir do gatilho em 180ms. Linhas de 36px, ícone em cinza, ação destrutiva em vermelho e separada.">
          <Stage className="flex h-full items-start">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="secondary" />}>
                Opções da conversa
                <CaretDownIcon weight="bold" className="size-3.5 text-ink-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem>
                  <ExportIcon />
                  Compartilhar
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <PencilSimpleIcon />
                  Renomear
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <PushPinIcon />
                  Fixar no topo
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ArchiveIcon />
                  Arquivar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <TrashIcon />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Stage>
        </Block>

        <Block title="Diálogo e aviso" note={copy.dialog}>
          <Stage className="flex h-full flex-wrap items-start gap-3">
            <Dialog>
              <DialogTrigger render={<Button variant="secondary" />}>Excluir conversa</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Excluir conversa?</DialogTitle>
                  <DialogDescription>
                    “Headlines da aula 1” será apagada para sempre, junto com os arquivos anexados nela.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="secondary" />}>Cancelar</DialogClose>
                  <DialogClose render={<Button variant="danger" />} onClick={() => toast("Conversa excluída")}>
                    Excluir
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="secondary" onClick={() => toast("Link copiado")}>
              Copiar link
            </Button>
          </Stage>
        </Block>
      </div>

      <Block title="Selos, atalhos, avatar e esqueleto">
        <Stage className="flex flex-wrap items-center gap-x-8 gap-y-5">
          <div className="flex items-center gap-2">
            <Badge>Rascunho</Badge>
            <Badge variant="outline">Beta</Badge>
            <Badge variant="solid">Pro</Badge>
            <Badge variant="danger">Falhou</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </div>
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarFallback>VP</AvatarFallback>
            </Avatar>
            <Avatar size="sm">
              <AvatarFallback>MS</AvatarFallback>
            </Avatar>
          </div>
          <div className="flex w-56 flex-col gap-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3.5 w-3/5" />
          </div>
        </Stage>
      </Block>
    </Section>
  )
}
