# 05 · Rodar no seu computador e criar o admin

> Ver o app funcionando e entrar como administrador. ⏱ 10 min · 🧰 passos 03 e 04 prontos.

## Passos
1. Envie o agente de exemplo (ou os seus) para o banco. Se não quiser o exemplo no app, deixe `"ativo": false` em `agentes/agente-exemplo/agente.json` antes:
   ```bash
   npm run agentes:sync
   ```
2. Ligue o app e deixe rodando:
   ```bash
   npm run dev
   ```
3. Em **outro terminal**, crie o seu usuário admin (use o seu e-mail):
   ```bash
   npm run admin:criar -- seu@email.com "Seu Nome"
   ```
4. Abra o **link** que ele mostrar, crie a sua senha e pronto: você está dentro.
5. Teste: **Novo chat** → pergunte "Quais são os 3 passos do método?" ao Agente Exemplo.

> O assistente em **http://localhost:3000/setup** mostra ao vivo o que está pronto e o que falta.

## ✅ Checkpoint
- A resposta aparece aos poucos e cita Clareza, Ação e Revisão.
- Pergunte "O que é o Relatório Z?": o agente deve dizer que **isso não está no material**.
- Em **Painel** (menu lateral) você vê o admin.

## ⚠️ Se der erro
- **Porta ocupada**: rode `npm run dev -- -p 3001` e troque `NEXT_PUBLIC_SITE_URL` para `http://localhost:3001` (e nas Redirect URLs do Supabase).
- **O link de senha abre "link inválido"**: ele vale 1 hora e só uma vez. Rode o `admin:criar` de novo.
- **"O material deste agente ainda não foi carregado"**: rode `npm run agentes:sync`.

### 🤖 Não resolveu? Peça ajuda para a IA
Rode `npm run diagnostico` e cole na sua IA (Claude, ChatGPT, Cursor) junto com:

```text
Estou instalando o template "Hub de Agentes de IA" e travei em: rodar o app localmente e criar o admin.
O que eu tentei fazer: [descreva]
Comando que rodei: [cole]
Mensagem de erro completa: [cole]
Diagnóstico (sem segredos): [cole a saída do npm run diagnostico]

Explique a causa em linguagem simples e me diga o passo exato para resolver.
Não me peça para colar chaves, tokens ou o .env.local aqui.
```

---

[← OpenAI](04-openai.md) · [Índice](README.md) · [Seu design system →](06-design-system.md)
