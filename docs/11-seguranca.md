# 11 · Segurança

> As regras que mantêm dados e chaves protegidos. Leia antes de mudar o código. ⏱ 5 min.

## Regras obrigatórias
- **Segredos só no servidor**: em `src/lib/env.server.ts` (tem `import "server-only"`). Nunca crie variável `NEXT_PUBLIC_` com segredo.
- No navegador só existe `src/lib/env.public.ts` (URL e chave pública do Supabase).
- `createAdminClient()` (service role, ignora o RLS) só no servidor e **só depois** de checar quem chamou (`getActiveUser` / `requireAdmin`). Para dados da pessoa, use `createClient()` de `src/lib/supabase/server.ts`, que respeita o RLS.
- Toda rota de API valida a entrada com `zod` e responde erro em português, sem stack trace.
- `npm run build` roda `scripts/check-client-secrets.mjs`: falha se um segredo aparecer no código do navegador.
- **Banco**: RLS em todas as tabelas. Mudança no banco = **nova** migration em `supabase/migrations/`, nunca editar uma antiga.
- **Cadastro público desligado** no Supabase (docs/03). Com ele ligado, qualquer pessoa entra de graça.

## Antes de publicar qualquer coisa
```bash
npm run check:leaks
```
Procura chaves, tokens, endereços de projeto e **os valores do seu `.env.local`** nos arquivos que iriam para o GitHub. Crie um arquivo `.termos-privados` (ignorado pelo git) com nomes que não podem aparecer (clientes, empresas), um por linha, e ele também será verificado. O mesmo teste roda no GitHub a cada push.

## Se uma chave vazou
1. **Troque a chave** na plataforma (Supabase: rotacionar; OpenAI: apagar e criar outra). Apagar o arquivo **não basta**: o histórico do git guarda.
2. Atualize o `.env.local` e as variáveis na Vercel.

## Onde ficam os dados de cada pessoa
Conversas, anexos e PDFs ficam no Supabase, visíveis só para a própria pessoa (RLS) e para o admin nas métricas agregadas. Os áudios e anexos ficam em buckets privados, com links temporários de 60 segundos.

---

[← Painel admin](10-painel-admin.md) · [Índice](README.md) · [Checklist de lançamento →](12-checklist-de-lancamento.md)
