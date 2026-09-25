# 03 · Supabase (banco, login e arquivos)

> Criar o projeto, ligar ao app e criar as tabelas. ⏱ 15 min · 🧰 conta no supabase.com, Node instalado.

## Passos
1. Em [supabase.com](https://supabase.com) clique em **New project**. Escolha um nome, uma **senha forte para o banco** (guarde num gerenciador de senhas) e a região **São Paulo** (sa-east-1). Espere ~2 min.
2. Vá em **Project Settings > API Keys** (ou **API**) e rode no projeto:
   ```bash
   npm run setup
   ```
   Ele pergunta e grava no `.env.local`:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / publishable** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role / secret** → `SUPABASE_SERVICE_ROLE_KEY` (**nunca** compartilhe esta)
3. Conecte o projeto e crie as tabelas:
   ```bash
   npx supabase login
   ```
   ```bash
   npx supabase link
   ```
   (escolha o projeto; ele pede a senha do banco do passo 1)
   ```bash
   npx supabase db push
   ```
4. **Feche o cadastro público** (importante!): **Authentication > Sign In / Providers** → desligue **Allow new users to sign up** → Save. Assim só entra quem comprou ou quem você convidou.
5. **URLs de login**: **Authentication > URL Configuration**
   - **Site URL**: `http://localhost:3000` (depois, o seu domínio)
   - **Redirect URLs**: adicione `http://localhost:3000/**` (e depois `https://seu-dominio.com.br/**`)
6. **E-mails de convite e senha**: **Authentication > Emails > Templates**
   - **Invite user**: cole o conteúdo de `supabase/templates/invite.html`
   - **Reset password**: cole `supabase/templates/recovery.html`
   - Troque "Hub de Agentes" pelo nome do seu hub.
7. (Recomendado para produção) **Authentication > Emails > SMTP**: configure um provedor de e-mail (Resend, Brevo, SES). O e-mail padrão do Supabase tem limite baixo de envios por hora.

## ✅ Checkpoint
```bash
npm run setup:check
```
Devem ficar verdes: *Chaves do Supabase*, *Conexão*, *Cadastro público desligado*, *Tabelas criadas*, *Armazenamento de arquivos*.

## ⚠️ Se der erro
- **Faltam tabelas**: o `db push` não rodou no projeto certo. Rode `npx supabase link` de novo e depois `npx supabase db push`.
- **Invalid API key**: você colou a chave errada (ou com espaço). Abra o `.env.local` (no Claude Code/VS Code ele aparece na lista; no Finder do Mac, `Cmd+Shift+.` mostra arquivos ocultos), apague o valor dessa linha e rode `npm run setup` de novo.
- **Projeto pausado** (plano Free): abra o painel do Supabase e clique em **Restore**.

### 🤖 Não resolveu? Peça ajuda para a IA
Rode `npm run diagnostico` e cole na sua IA (Claude, ChatGPT, Cursor) junto com:

```text
Estou instalando o template "Hub de Agentes de IA" e travei em: a configuração do Supabase.
O que eu tentei fazer: [descreva]
Comando que rodei: [cole]
Mensagem de erro completa: [cole]
Diagnóstico (sem segredos): [cole a saída do npm run diagnostico]

Explique a causa em linguagem simples e me diga o passo exato para resolver.
Não me peça para colar chaves, tokens ou o .env.local aqui.
```

---

[← Pré-requisitos](02-pre-requisitos.md) · [Índice](README.md) · [OpenAI →](04-openai.md)
