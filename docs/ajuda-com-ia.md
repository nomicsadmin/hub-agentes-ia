# Travou? A IA te ajuda

> Em qualquer erro, você tem um caminho pronto para pedir ajuda a uma IA e concluir sozinho.

## 1. Gere o diagnóstico (sem segredos)
```bash
npm run diagnostico
```
Ele mostra versões, quais variáveis existem (**sem os valores**), o resultado de cada checagem e os agentes da pasta. Chaves, e-mails e o endereço do seu projeto saem como `[OCULTO]`. Também salva em `diagnostico.txt`.

> No navegador, a página **/setup** tem o botão **Pedir ajuda para a IA** em cada item vermelho: ele copia o pedido já com o erro.

## 2. Cole na IA com este pedido
```text
Estou instalando o template "Hub de Agentes de IA" (Next.js + Supabase + OpenAI) e travei.
Passo em que travei: [ex.: 03 Supabase, db push]
O que eu tentei fazer: [descreva]
Comando que rodei: [cole]
Mensagem de erro completa: [cole]
Diagnóstico: [cole a saída do npm run diagnostico]

Explique a causa em linguagem simples e me diga o passo exato para resolver.
Não me peça para colar chaves, tokens ou o .env.local aqui.
```

## 3. Nunca cole em uma IA (nem em lugar público)
- `SUPABASE_SERVICE_ROLE_KEY` (a chave mestra do banco)
- `OPENAI_API_KEY`
- O arquivo `.env.local` inteiro
- Senhas do banco ou tokens de webhook

Se colou sem querer: **troque a chave** na plataforma (docs/11-seguranca.md).

## Melhor ainda: IA dentro do projeto
Abra a pasta no **Claude Code** (ou Cursor/Codex). O arquivo `AGENTS.md` explica o projeto para a IA, então ela lê o código, roda `npm run setup:check` e corrige com contexto. Exemplos de pedidos:
- "Rode o setup:check e me ajude a deixar tudo verde."
- "Troque meu design system por este (cores e logo em meus-materiais/)."
- "Crie um agente novo a partir destes PDFs em meus-materiais/."
- "O agente respondeu errado sobre X; ajuste o prompt e teste de novo."
