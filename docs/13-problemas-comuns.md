# 13 · Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| Tudo redireciona para `/setup` | Faltam as chaves do Supabase | `npm run setup` |
| "Faça login para continuar" na API | Sessão expirou | Entre de novo |
| "Seu acesso está bloqueado" | Reembolso/cancelamento ou bloqueio manual | **Admin > [seu público, ex.: Alunos]** → liberar |
| Convite não chega | Limite de e-mails do Supabase ou spam | Configure SMTP (docs/03) e veja o spam |
| Link de senha "inválido" | Expirou ou já foi usado | "Esqueci minha senha" ou `npm run admin:criar` |
| Agente diz "material ainda não foi carregado" | Sem documento pronto | `npm run agentes:sync` |
| Agente inventa coisas | Prompt fraco ou material vago | Reforce o `prompt.md` + **Correções** no admin |
| Botão de áudio avisa indisponível | `OPENAI_TRANSCRIBE_MODEL` vazio | docs/04 |
| Resposta cortada ou erro 429 | Sem crédito/limite da OpenAI | platform.openai.com > Billing |
| Build falha na Vercel | Variável de ambiente faltando | Adicione e **Redeploy** |
| Cores não mudaram | Editou só um tema | Edite `:root` e `.dark` em `globals.css` |
| PDF enviado "sem texto" | PDF escaneado (imagem) | Faça OCR antes |

### 🤖 Não resolveu? Peça ajuda para a IA
Rode `npm run diagnostico` e cole na sua IA (Claude, ChatGPT, Cursor) junto com:

```text
Estou instalando o template "Hub de Agentes de IA" e travei em: um erro que não está nesta tabela.
O que eu tentei fazer: [descreva]
Comando que rodei: [cole]
Mensagem de erro completa: [cole]
Diagnóstico (sem segredos): [cole a saída do npm run diagnostico]

Explique a causa em linguagem simples e me diga o passo exato para resolver.
Não me peça para colar chaves, tokens ou o .env.local aqui.
```

---

[← Checklist de lançamento](12-checklist-de-lancamento.md) · [Índice](README.md) · [Início →](../README.md)
