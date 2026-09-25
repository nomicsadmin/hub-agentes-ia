# 01 · Como construímos (o passo a passo real)

> O processo que usamos para sair do zero até o hub no ar, em um dia, com IA. Use como receita para as suas próprias evoluções. ⏱ 10 min de leitura.

## 1. Planejar antes de construir (com IA, sem código)
Começamos numa conversa com a IA em **modo de planejamento**: nada de código, só perguntas e decisões.
1. **Descrever o que queremos** em linguagem natural: stack, telas, sidebar, admin, mobile first.
2. **A IA explica o que entendeu** e faz perguntas de múltipla escolha, uma decisão por vez: login (e-mail e senha), como a compra libera o acesso (1 produto libera tudo), o que "apagar" significa (lixeira com restauração).
3. **Mandamos os materiais** (PDFs e documentos). A IA leu tudo, explicou cada metodologia, apontou **lacunas** (termos citados e nunca explicados) e **conflitos** entre documentos, e perguntou qual valia.
4. **Decisão técnica que simplificou tudo:** o material cabia inteiro no contexto do modelo, então nada de busca complexa no começo (o RAG fica pronto para quando crescer).
5. **Pedidos que surgiram no caminho** entraram no plano: áudio, anexos, PDF gerado pelo agente e o rastreio de temas com dificuldade.

O modelo desse plano está em [modelos/PLANO-MODELO.md](modelos/PLANO-MODELO.md).

## 2. Design system primeiro
Em paralelo (outra conversa), a IA montou o **design system**: tokens de cor, tipografia, raios, componentes de chat (compositor, mensagens, streaming, "pensando"). Resultado: a página `/design-system` e o arquivo `DESIGN.md`. Tudo no app usa esses tokens, por isso trocar o visual é trocar um arquivo.

## 3. Base de segurança antes das telas
Antes de qualquer funcionalidade, criamos a base que todo o resto usa:
- esquema do banco com **RLS em todas as tabelas** (cada pessoa só vê o que é dela);
- separação de segredos (`env.server.ts` só no servidor) e um **teste no build** que falha se um segredo vazar para o navegador;
- proxy de sessão, `requireUser`/`requireAdmin`, contrato do chat.

## 4. Quatro frentes em paralelo
Com a base pronta, dividimos o trabalho em 4 frentes que não mexiam nos mesmos arquivos (cada IA/agente cuidou de uma):

| Frente | O que entregou |
|---|---|
| **A · Acesso** | login, esqueci/definir senha, convite, webhook de pagamento, bloqueio |
| **B · Motor do chat** | `/api/chat` com streaming, prompt com material e correções, áudio, anexos, PDF, classificação de temas |
| **C · App e barra lateral** | chat, sidebar (novo chat, agentes, busca, pastas, tags, fixadas, arquivadas, lixeira), tema claro/escuro, PWA |
| **D · Admin** | painel com ativos e inativos (7/15/30 dias), usuários, agentes (prompt, documentos, correções, avaliações), temas e dificuldades, limites |

## 5. Ajustes finos no celular
Testamos no celular de verdade e ajustamos: campo de mensagem mais alto, sidebar mais larga, imagens em popup, senha mínima.

## 6. Virou este template
Tiramos tudo o que era de um cliente específico, transformamos o fixo em configuração (`app.config.ts`, pasta `agentes/`, pagamento plugável) e escrevemos este guia.

> **Dica:** para evoluir o seu hub, repita o ciclo: **planejar com IA → aprovar → construir em partes pequenas → testar no celular.**

---

[← Visão geral](00-visao-geral.md) · [Índice](README.md) · [Pré-requisitos →](02-pre-requisitos.md)
