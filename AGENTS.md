<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Hub de Agentes de IA · guia para IAs de código

Template de hub de agentes de IA: Next.js 16 (App Router) + Supabase (Postgres, Auth, Storage, RLS) + OpenAI (Responses API com streaming) + Vercel. Interface em português do Brasil.

## Se a pessoa pedir para "montar o hub"
Siga `COMECE-AQUI.md` (também disponível como skill `/montar-meu-hub`). Uma decisão por vez, mostre antes de alterar, **nunca peça chaves no chat**.

## Comandos
| Comando | Para quê |
|---|---|
| `npm run setup` / `npm run setup:check` | cria/confere o `.env.local` e roda as checagens de instalação |
| `npm run diagnostico` | relatório sem segredos para depurar |
| `npm run agentes:sync` | envia `agentes/` (agentes, prompts, materiais, temas) para o banco |
| `npm run admin:criar -- email "Nome"` | cria o admin e mostra o link de senha |
| `npm run webhook:teste -- liberar email` | simula uma compra na Hubla (app rodando) |
| `npm run check:leaks` | procura segredos/termos privados antes de publicar |
| `npm run lint` e `npx tsc --noEmit` | qualidade do código |

## Onde fica cada coisa
- Marca e público: `src/config/app.config.ts` (textos sobre o público via `src/config/copy.ts`: `pub.um`, `pub.varios`, `g()`).
- Design system: tokens em `src/app/globals.css` (bloco SEU DESIGN SYSTEM), regras em `DESIGN.md`, vitrine em `/design-system`.
- Agentes: `agentes/<slug>/{agente.json,prompt.md,conhecimento/}` + `agentes/_topicos.json`.
- Prompt montado: `src/lib/ai/prompt.ts` (prompt + regras do app + correções + documentos; RAG acima de 80 mil tokens).
- Chat: `src/app/api/chat/route.ts` (SSE, contrato em `src/lib/chat/contract.ts`).
- Pagamento: `src/lib/payments/*` + `src/app/api/webhooks/[provider]/route.ts`.
- Instalação: `src/lib/setup/checks.ts` (usado por `/setup` e pelos scripts).
- Banco: `supabase/migrations/` (nunca edite uma migration antiga; crie uma nova).

## Regras de segurança (obrigatórias)
Leia `docs/11-seguranca.md`. Resumo: segredos só em `src/lib/env.server.ts`; nunca `NEXT_PUBLIC_` com segredo; `createAdminClient()` só depois de `requireAdmin`/`getActiveUser`; validar entrada com `zod`; `npm run build` falha se um segredo for para o navegador.

## Convenções
Português do Brasil, sem travessão (—) na interface; mobile first (alvos de 44px, campo de 16px); só tokens de cor/forma (`bg-canvas`, `text-ink-2`, `rounded-control`), nunca cores soltas; ícones `@phosphor-icons/react`; fuso e idioma de `app.config.ts`.
