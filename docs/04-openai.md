# 04 · OpenAI (a inteligência)

> Chave, modelos e controle de custo. ⏱ 10 min · 🧰 conta em platform.openai.com com crédito.

## Passos
1. Em [platform.openai.com](https://platform.openai.com) → **Settings > Billing**: adicione crédito (ex.: US$ 10) e, se quiser, um limite mensal.
2. **API keys > Create new secret key**. Rode `npm run setup` e cole quando pedir (ou cole em `OPENAI_API_KEY` no `.env.local`).
3. Modelos (no `.env.local`):
   | Variável | Para quê | Exemplo |
   |---|---|---|
   | `OPENAI_MODEL` | Chat dos agentes | o modelo que você escolheu (tem que aparecer em **Models** na sua conta) |
   | `OPENAI_TRANSCRIBE_MODEL` | Mensagens de áudio | um modelo de transcrição da sua conta (ex.: `gpt-4o-mini-transcribe` ou `whisper-1`). Vazio = áudio desligado |
   | `OPENAI_EMBEDDING_MODEL` | Busca por trechos (bases grandes) | `text-embedding-3-small` |

## Controle de custo
- **Admin > Configurações > Limites diários por pessoa**: mensagens, áudios, anexos e PDFs por dia.
- O material vai sempre na mesma ordem no início do prompt, o que ativa o **cache automático** da OpenAI e reduz o custo das perguntas seguintes.
- Acompanhe em **platform.openai.com > Usage**.

## ✅ Checkpoint
```bash
npm run setup:check
```
Verde em *Chave e modelo da OpenAI* e *OpenAI responde com esse modelo*.

## ⚠️ Se der erro
- **401**: chave inválida ou apagada. Gere outra.
- **404 no modelo**: o nome em `OPENAI_MODEL` não existe na sua conta. Copie o nome exato de **Models**.
- **429**: sem crédito ou limite atingido. Veja **Billing**.

### 🤖 Não resolveu? Peça ajuda para a IA
Rode `npm run diagnostico` e cole na sua IA (Claude, ChatGPT, Cursor) junto com:

```text
Estou instalando o template "Hub de Agentes de IA" e travei em: a configuração da OpenAI.
O que eu tentei fazer: [descreva]
Comando que rodei: [cole]
Mensagem de erro completa: [cole]
Diagnóstico (sem segredos): [cole a saída do npm run diagnostico]

Explique a causa em linguagem simples e me diga o passo exato para resolver.
Não me peça para colar chaves, tokens ou o .env.local aqui.
```

---

[← Supabase](03-supabase.md) · [Índice](README.md) · [Rodar no seu computador →](05-rodar-local.md)
