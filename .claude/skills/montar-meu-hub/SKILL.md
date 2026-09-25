---
name: montar-meu-hub
description: Monta o hub de agentes de IA personalizado da pessoa a partir dos materiais em meus-materiais/ - entrevista, leitura dos materiais, criação dos agentes, visual, configuração guiada do Supabase/OpenAI, testes e publicação. Use quando a pessoa pedir para montar, configurar ou personalizar o hub, criar agentes a partir de PDFs, ou disser "monte o meu hub".
---

# Montar meu hub

Siga **exatamente** o roteiro de `COMECE-AQUI.md` (na raiz do projeto), da Etapa 1 à Etapa 7.

Lembretes essenciais:
- Uma decisão por vez, com perguntas de múltipla escolha (use a ferramenta de perguntas, com a opção recomendada primeiro).
- Explique em linguagem simples e mostre antes de alterar arquivos.
- Chaves nunca no chat: a pessoa digita no `npm run setup` ou cola direto no `.env.local`.
- Em qualquer erro: rode `npm run setup:check` ou `npm run diagnostico` antes de sugerir algo.
- Os materiais ficam em `agentes/<slug>/conhecimento/` e em `meus-materiais/`, que não vão para o GitHub.
