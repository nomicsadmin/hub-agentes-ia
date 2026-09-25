# 02 · Pré-requisitos

> As contas e programas que você precisa, o que cada um faz e quanto custa. ⏱ 20 min · 🧰 um e-mail e um cartão (só para a OpenAI).

## Programas no computador
| Programa | Para quê | Como instalar |
|---|---|---|
| **Node.js 22.18+** (LTS) | Roda o app no seu computador | [nodejs.org](https://nodejs.org) → botão LTS |
| **Claude Code** (ou Cursor/Codex) | A IA que monta o hub com você | [claude.com/claude-code](https://claude.com/claude-code) (app desktop) |
| **Git** (opcional) | Baixar e versionar o projeto | Mac: já vem; Windows: [git-scm.com](https://git-scm.com) |

## Contas online
| Conta | O que é | Custo para começar |
|---|---|---|
| **GitHub** | Onde o código fica guardado | Grátis |
| **Supabase** | Banco de dados, login e arquivos | Grátis (plano Free: bom para começar; projetos parados por 7 dias são pausados) |
| **OpenAI** | A inteligência dos agentes | Pague pelo uso (coloque crédito, ex.: US$ 10) |
| **Vercel** | Coloca o app na internet | Hobby é grátis, mas **só para uso não comercial**; se você vende acesso, use o **Pro** |
| **Plataforma de pagamento** (opcional) | Libera acesso na compra | Hubla já vem pronta; outras exigem um adaptador |

## Quanto custa manter (estimativa)
| Item | Faixa |
|---|---|
| Supabase | US$ 0 (Free) a US$ 25/mês (Pro, sem pausa e com backup) |
| Vercel | US$ 0 (Hobby, não comercial) a US$ 20/mês (Pro) |
| OpenAI | Depende do modelo e do uso. Cada pergunta envia o material do agente (com cache, que barateia muito). Comece com os **limites diários** do admin e acompanhe em platform.openai.com > Usage. |

> Para 100 pessoas ativas fazendo ~5 perguntas por dia, faça a conta com os preços atuais do seu modelo em openai.com/api/pricing: tokens de entrada (material + histórico, a maior parte com desconto de cache) + tokens de saída (a resposta).

## ✅ Checkpoint
No terminal (ou pedindo para a IA rodar):
```bash
node -v
```
Deve mostrar `v22.18` ou maior.

## ⚠️ Se der erro
- **`node: command not found`**: instale o Node.js e **feche e abra o terminal** de novo.
- **Versão antiga**: instale a LTS mais nova por cima.

### 🤖 Não resolveu? Peça ajuda para a IA
Rode `npm run diagnostico` e cole na sua IA (Claude, ChatGPT, Cursor) junto com:

```text
Estou instalando o template "Hub de Agentes de IA" e travei em: a instalação dos pré-requisitos (Node.js).
O que eu tentei fazer: [descreva]
Comando que rodei: [cole]
Mensagem de erro completa: [cole]
Diagnóstico (sem segredos): [cole a saída do npm run diagnostico]

Explique a causa em linguagem simples e me diga o passo exato para resolver.
Não me peça para colar chaves, tokens ou o .env.local aqui.
```

---

[← Como construímos](01-como-construimos.md) · [Índice](README.md) · [Supabase →](03-supabase.md)
