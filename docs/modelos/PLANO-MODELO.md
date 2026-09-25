# Modelo de plano · Hub de Agentes

> Use este modelo para planejar o SEU hub (ou uma evolução) com a IA **antes** de escrever código.
> Peça: "Vamos planejar, sem construir nada. Preencha este modelo comigo, uma decisão por vez."

## Contexto
- **Para quem:** [ex.: alunos do curso X, 90% no celular]
- **Problema que resolve:** [ex.: dúvidas repetidas sobre o método, fora do horário de suporte]
- **Resultado esperado:** [ex.: agentes que respondem com base no material, 24h]

## Decisões
| Tema | Decisão |
|---|---|
| Agentes no lançamento | [nome e foco de cada um] |
| Materiais por agente | [arquivos e prioridade em caso de conflito] |
| Tom de voz | [mentor direto / acolhedor / técnico / voz de uma pessoa] |
| Como o acesso é liberado | [1 produto libera tudo / produtos por agente / assinatura / só convite] |
| Login | e-mail e senha (convite na compra) |
| Apagar conversa | lixeira com restauração (N dias) |
| Áudio / anexos / PDF gerado | [sim/não] |
| Métricas | ativos, sem acesso há 7/15/30 dias, temas e dificuldades |

## Base de conhecimento
| Agente | Fonte | Tamanho | Conteúdo resumido |
|---|---|---|---|
| | | | |

- **Lacunas encontradas:** [termos citados e não explicados; o agente diz "não está no material"]
- **Conflitos entre materiais:** [qual vale]
- **Modo:** material inteiro no prompt (até ~80 mil tokens) ou busca por trechos (acima)

## Rascunho das instruções
**Comum a todos:** idioma, tom, só com base no material, não inventar, terminar com próximo passo.
**Agente 1:** papel · o que faz · o que não faz · atalhos iniciais.

## Fases de construção
0. Setup e design system
1. Acesso (login, convite, pagamento)
2. Chat com streaming + base de conhecimento
3. Sidebar e organização (pastas, tags, fixar, arquivar, lixeira, busca)
4. Admin: agentes, correções, documentos
5. Admin: métricas e temas
6. Polimento mobile e publicação

## Verificação
- Perguntas de teste por agente: uma que o material responde, uma lacuna, um conflito.
- Teste num iPhone e num Android reais.
- Compra de teste libera; reembolso de teste bloqueia.
- `npm run check:leaks` antes de publicar.
