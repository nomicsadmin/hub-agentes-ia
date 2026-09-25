# 10 · Painel admin

> O que cada tela do admin faz. ⏱ 5 min de leitura.

| Tela | O que tem |
|---|---|
| **Painel** | total de pessoas, ativas (7 dias), sem acesso há 7/15/30 dias, acessos, mensagens, uso de áudio/anexos/PDF, mensagens por semana |
| **[Seu público]** (ex.: Alunos) | busca, filtros (ativos, bloqueados, sem acesso há X dias), ordenação, exportar CSV, liberar/bloquear, promover a admin, adicionar manualmente |
| **Agentes** | por agente: prompt (com histórico), correções, documentos (upload, prioridade), avaliações 👎 |
| **Temas e dificuldades** | temas mais perguntados, onde as pessoas mais travam, evolução semanal, **lacunas do material** (perguntas que o agente não soube), exportar CSV, editar a lista de temas |
| **Configurações** | limites diários por pessoa (mensagens, áudios, anexos, PDFs) e dias na lixeira |

## Como o "Temas e dificuldades" funciona
Cada pergunta é classificada em segundo plano (sem deixar o chat lento) em um dos temas de `agentes/_topicos.json`. Sinais de dificuldade: pergunta repetida no mesmo tema, frases como "não entendi", 👎, conversa longa e resposta "não está no material" (vira **lacuna**). Use para planejar aulas, lives e o que falta no material.

> Quer ver o painel cheio antes de ter usuários? `npm run demo:dados` cria pessoas fictícias (e `npm run demo:dados -- --limpar` apaga).

---

[← Publicar na Vercel](09-deploy-vercel.md) · [Índice](README.md) · [Segurança →](11-seguranca.md)
