# 09 · Publicar na Vercel

> Colocar o hub na internet com o seu domínio. ⏱ 20 min · 🧰 conta no GitHub e na Vercel.

## Passos
1. **GitHub**: crie um repositório **privado** e envie o projeto. Peça à IA: "crie um repositório privado no GitHub e envie este projeto" (ela instala/usa o git e o GitHub CLI com você; se você baixou o ZIP, ela inicia o git na pasta). Sem terminal, o app **GitHub Desktop** também faz isso. O `.env.local`, `meus-materiais/` e os materiais dos agentes **não** vão.
2. **Vercel**: **Add New > Project** → importe o repositório.
3. **Environment Variables**: abra o `.env.local`, copie o conteúdo inteiro e cole no primeiro campo da tela de variáveis da Vercel (ela separa cada linha sozinha). Depois troque:
   - `NEXT_PUBLIC_SITE_URL` = `https://seu-dominio.com.br`
   - (use o mesmo `CRON_SECRET`; a Vercel usa ele para a rotina diária da lixeira)
4. **Deploy**. Depois, **Settings > Domains** → adicione o seu domínio e siga as instruções de DNS.
5. **Supabase > Authentication > URL Configuration**: Site URL = `https://seu-dominio.com.br` e adicione `https://seu-dominio.com.br/**` em Redirect URLs.
6. Crie o admin de produção (se usar outro projeto Supabase) com `npm run admin:criar`, apontando o `.env.local` para ele.

## Subcaminho (opcional, avançado)
Para servir em `meusite.com.br/agentes` (Multi-Zones), defina `NEXT_PUBLIC_BASE_PATH=/agentes`, `NEXT_PUBLIC_SITE_URL=https://meusite.com.br/agentes`, `ALLOWED_ORIGINS=meusite.com.br` e troque o caminho do cron em `vercel.json` para `/agentes/api/cron/purge-trash`.

## ✅ Checkpoint
- Abra `https://seu-dominio.com.br` → tela de login.
- Faça login, converse com um agente, teste no celular e use **Adicionar à tela inicial**.
- `https://seu-dominio.com.br/setup` deve dar **404** (some depois que existe um admin).

## ⚠️ Se der erro
- **Build falha com "Variáveis de ambiente do servidor inválidas"**: faltou uma variável na Vercel. Adicione e clique em **Redeploy**.
- **Link do convite abre localhost**: `NEXT_PUBLIC_SITE_URL` ou a Site URL do Supabase ainda estão com localhost.

### 🤖 Não resolveu? Peça ajuda para a IA
Rode `npm run diagnostico` e cole na sua IA (Claude, ChatGPT, Cursor) junto com:

```text
Estou instalando o template "Hub de Agentes de IA" e travei em: a publicação na Vercel.
O que eu tentei fazer: [descreva]
Comando que rodei: [cole]
Mensagem de erro completa: [cole]
Diagnóstico (sem segredos): [cole a saída do npm run diagnostico]

Explique a causa em linguagem simples e me diga o passo exato para resolver.
Não me peça para colar chaves, tokens ou o .env.local aqui.
```

---

[← Pagamento](08-pagamento.md) · [Índice](README.md) · [Painel admin →](10-painel-admin.md)
