---
name: Grafite (tema de exemplo)
description: Tema de exemplo do Hub de Agentes. Grafite sobre papel, na linguagem do ChatGPT. Troque pelo seu design system.
colors:
  canvas: "#ffffff"
  rail: "#f9f9f9"
  surface: "#ffffff"
  bubble: "#f4f4f4"
  edge: "#e6e6e6"
  ink: "#0d0d0d"
  ink-2: "#5d5d5d"
  ink-3: "#6e6e6e"
  ink-4: "#8f8f8f"
  ink-inverse: "#ffffff"
  line: "rgb(0 0 0 / 0.1)"
  line-strong: "rgb(0 0 0 / 0.15)"
  hover: "rgb(0 0 0 / 0.05)"
  press: "rgb(0 0 0 / 0.08)"
  tooltip: "#000000"
  scrim: "rgb(0 0 0 / 0.5)"
  danger: "#c42b26"
  dark-canvas: "#212121"
  dark-rail: "#181818"
  dark-surface: "#303030"
  dark-bubble: "#303030"
  dark-edge: "#3a3a3a"
  dark-ink: "#ececec"
  dark-ink-2: "#b4b4b4"
  dark-ink-3: "#9b9b9b"
  dark-ink-4: "#6b6b6b"
  dark-danger: "#ff7a70"
typography:
  display:
    fontFamily: "ui-sans-serif, -apple-system, system-ui, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "normal"
  h2:
    fontFamily: "ui-sans-serif, -apple-system, system-ui, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.4
  h3:
    fontFamily: "ui-sans-serif, -apple-system, system-ui, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.45
  body:
    fontFamily: "ui-sans-serif, -apple-system, system-ui, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.625
  ui:
    fontFamily: "ui-sans-serif, -apple-system, system-ui, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  meta:
    fontFamily: "ui-sans-serif, -apple-system, system-ui, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "18px"
  micro:
    fontFamily: "ui-sans-serif, -apple-system, system-ui, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
  mono:
    fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "20px"
rounded:
  none: "0px"
  row: "6px"
  control: "10px"
  panel: "16px"
  bubble: "18px"
  composer: "28px"
  pill: "9999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  2xl: "20px"
  section: "24px"
  turn: "40px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ink-inverse}"
    typography: "{typography.ui}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 14px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "36px"
  button-ghost-hover:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.ink}"
  rail-item:
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 10px"
  rail-item-active:
    backgroundColor: "{colors.press}"
  user-message:
    backgroundColor: "{colors.bubble}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.bubble}"
    padding: "10px 16px"
  composer:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.composer}"
  send-button:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ink-inverse}"
    rounded: "{rounded.pill}"
    size: "36px"
  tooltip:
    backgroundColor: "{colors.tooltip}"
    textColor: "#ffffff"
    typography: "{typography.micro}"
    rounded: "8px"
    padding: "4px 8px"
  badge:
    backgroundColor: "{colors.bubble}"
    textColor: "{colors.ink-2}"
    typography: "{typography.micro}"
    rounded: "{rounded.none}"
    height: "20px"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.control}"
    height: "40px"
---

# Design System: Grafite (exemplo)

> **Este é o design system de exemplo do template.** Para usar o seu, troque os
> valores em `src/app/globals.css` e atualize este arquivo com as suas regras.
> O guia completo está em `docs/06-design-system.md`. Se usar IA, basta pedir:
> "leia o DESIGN.md e aplique o meu design system (cores, fontes, raios) a partir destas referências".

Fonte da verdade no código: `src/app/globals.css` (tokens) e `src/components/` (componentes). Página viva: rota `/design-system`.

## Overview

Grafite sobre papel. O tema segue a linguagem do ChatGPT: fundo claro, tinta quase preta, zero cor de marca e controles que somem até serem necessários. A conversa é o produto; a interface recua para o texto do agente aparecer.

Modo: Operate. O usuário vem para trabalhar com um agente, então legibilidade, previsibilidade e convenções familiares do ChatGPT pesam mais que expressão. A personalidade mora nos detalhes: a grade de pixels que pensa, as palavras que se resolvem do desfoque e um único momento de cor.

Referências aplicadas: ficha Refero do ChatGPT (identidade), UI by Halaska (padrões de produto de IA: pensamento, fontes, decisão), beautifului.dev (Loading State e Prompt Bar), transitions.dev (Streaming text). Skills usadas: tasteskill, frontend-design (Anthropic) e impeccable.

## Colors

Estratégia: acromática contida. Quatro tons de tinta, três superfícies, estados por transparência.

### Neutral

- **Canvas** (#ffffff / escuro #212121): área da conversa.
- **Rail** (#f9f9f9 / #181818): barra lateral; recua atrás da conversa.
- **Surface** (#ffffff / #303030): menus, compositor e painéis flutuantes.
- **Bubble** (#f4f4f4 / #303030): mensagem do usuário, blocos de código, código inline.
- **Ink** (#0d0d0d / #ececec): texto e ícones principais. Contraste 19,4:1.
- **Ink 2** (#5d5d5d / #b4b4b4): texto secundário e metadados.
- **Ink 3** (#6e6e6e / #9b9b9b): ajuda e placeholder. Escurecido em relação à Refero (#8f8f8f tinha 3,2:1) para passar em AA.
- **Ink 4** (#8f8f8f / #6b6b6b): desabilitado e decorativo. Nunca texto de leitura.
- **Line** (preto 10% / branco 10%): a única divisória estrutural.
- **Hover** (preto 5% / branco 6%) e **Press** (preto 8% / branco 10%): véus de estado.

### Named Rules

- **Uma cor, um momento.** A única cor da interface é a varredura arco-íris (shader WebGL `glimm`) que atravessa o compositor ao escolher o modelo Pro. Nada mais é colorido.
- **Vermelho é semântico.** `danger` só aparece em ações destrutivas e mensagens de erro, nunca como acento.
- **Preto puro só na dica.** `#000` é exclusivo do tooltip; texto usa `ink`.

## Typography

Fonte do sistema operacional (SF no Apple, Segoe no Windows). Nenhuma webfont: carrega instantâneo, renderiza nativo. O maior tamanho da interface é 24px, reservado para a tela inicial.

### Hierarchy

- **Display** 24/32, 600: título da tela inicial ("Por onde começamos?").
- **H2** 20/28, 600 e **H3** 18/26, 600: títulos dentro da resposta do agente.
- **Body** 16/26, 400: resposta do agente e mensagem do usuário.
- **UI** 14/20, 400 e 500: controles, barra lateral, menus.
- **Meta** 13/18, 500: estados do agente ("Pensou por 4,2 s"), rótulos de grupo.
- **Micro** 12/16: dicas, avisos, selos.
- **Mono** 13/20: só código, cronômetro e medidas.

### Named Rules

- Hierarquia por peso e tom de cinza, nunca por cor.
- Números com decimal em vírgula ("4,2 s"), como se lê em pt-BR; dígitos tabulares no cronômetro.

## Layout

Duas colunas: barra lateral de 260px e conversa centralizada em até 768px. Cabeçalho de 52px. Entre turnos da conversa, 40px; entre elementos, 6px; entre seções, 24px. No celular (< 768px) a barra lateral vira gaveta sobre o scrim; o balão do usuário vai a 85% da largura.

## Elevation & Depth

Plano por convicção. Um painel sobe por uma linha de 1px (`line`), nunca por sombra. No tema escuro, a própria superfície clareia (#303030 sobre #212121). Fundo de diálogo: scrim de 50% sem desfoque.

### Named Rules

- Sem `box-shadow` em nenhum componente. Sem vidro ou desfoque decorativo.

## Shapes

Uma regra por tipo de peça:

- 6px: linhas dentro de menus.
- 10px: botões, itens da barra lateral, campos, cards, menus pequenos.
- 16px: painéis grandes, menus do compositor, diálogos.
- 18px: balão do usuário.
- 28px: compositor (vira 24px quando cresce para duas linhas).
- Pílula: botão de enviar, chips de agente, pílulas de fonte, ação "Entrar".
- 0px: selos (quebra deliberada da ficha Refero).

## Components

### Buttons

Primário é tinta sólida (`ink` com texto `ink-inverse`), hover a 85%. Secundário: superfície com linha. Ghost e quiet: transparentes com véu no hover. Danger: vermelho sólido, só para confirmar exclusão. Pressionar reduz a 98%. Tamanhos 32, 36 e 44px de altura.

### Navigation

Itens da barra lateral transparentes em repouso, véu de 5% no hover, 8% no item ativo. Grupos de conversa rotulados por tempo ("Hoje", "Ontem", "Últimos 7 dias") em meta cinza, sem caixa alta.

### Inputs / Fields

Rótulo acima, ajuda ou erro abaixo. Borda `line-strong`, foco escurece a borda e mostra anel de 2px. Erro: borda e texto `danger`, mensagem que diz como corrigir.

### Prompt Bar (componente assinatura)

Compositor com `+`/`@` (fontes e anexos), `/` (comandos), escolha de modelo, ditado e enviar. Menus sobem a partir do compositor em 180ms com um único destaque que desliza entre linhas (220ms). Enviar é um círculo de tinta; enquanto o agente responde, vira "parar". Escolher o modelo Pro dispara a varredura arco-íris.

### Estado do agente

- **Loading State:** grade de pixels 3×3 (Drive, Dots, Orbit), rótulo com brilho e cronômetro. Com movimento reduzido, a grade congela e o cronômetro continua.
- **Raciocínio:** etapas aparecem uma a uma; ao terminar, recolhem para "Pensou por X s".
- **Streaming:** cada palavra sai de um desfoque de 1px em 350ms, uma a cada 60ms.
- **Decisão:** o agente para e mostra uma pergunta com opções e consequências; o usuário continua ou pula.

### Mensagens

Usuário: balão `bubble` à direita, até 70% da largura. Agente: sem balão, texto corrido; ações (copiar, avaliar, refazer) no fim da resposta; sugestões de próximo passo em linhas com véu.

## Do's and Don'ts

### Do:

- Use `ink` para todo texto principal e `ink-2`/`ink-3` para hierarquia.
- Use véu (`hover`, `press`) para estado; a interface respira, não pisca.
- Mantenha a resposta do agente como a maior massa de texto da tela.
- Respeite `prefers-reduced-motion` em toda animação.
- Escreva em português claro, na voz ativa; o botão diz exatamente o que faz.

### Don't:

- Não introduza cor de marca, gradiente ou acento colorido fora da varredura do modelo Pro.
- Não use sombra para elevar; use a linha de 1px.
- Não use texto maior que 24px.
- Não carregue webfonts.
- Não use travessão (—) na interface; use ponto, vírgula ou dois-pontos.
- Não invente afirmações sobre o seu método: todo conteúdo de exemplo é ilustrativo.
