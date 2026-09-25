# 06 · Seu design system

> Trocar cores, fontes, raios, logo, ícones, PDF e e-mails para a sua marca. ⏱ 20 a 60 min · 🧰 suas cores, logo e, se tiver, um site de referência.

## O jeito fácil (com IA)
Coloque o logo e prints de referência em `meus-materiais/` e peça:
```text
Leia o DESIGN.md e docs/06-design-system.md. Aplique o meu design system:
cores [#...], fonte [nome ou "do sistema"], cantos [mais retos | mais arredondados],
usando o logo e a referência em meus-materiais/. Mantenha contraste AA nos temas claro e escuro.
Mostre o resultado em /design-system antes de terminar.
```

## O que trocar, arquivo por arquivo
| O quê | Onde |
|---|---|
| Nome, descrição, público, cores da barra do celular | `src/config/app.config.ts` |
| Cores, raios, espaçamentos (claro e escuro) | `src/app/globals.css`, bloco **SEU DESIGN SYSTEM** (`:root` = claro, `.dark` = escuro) |
| Fonte | `globals.css` (`--f-sans`, `--f-display`...). Para Google Fonts, carregue com `next/font` em `src/app/layout.tsx` |
| Ícones do app (PWA/favicon) | `public/icons/` (192, 512, maskable 512, apple-touch 180, svg) |
| Nome no PDF gerado | automático (vem do `app.config.ts`) |
| E-mails de convite/senha | `supabase/templates/*.html` e o painel do Supabase (docs/03) |
| Regras visuais para a IA seguir | `DESIGN.md` |

## Tokens principais
| Token | Uso |
|---|---|
| `--canvas`, `--rail`, `--surface`, `--bubble` | fundos: conversa, barra lateral, menus, balão do usuário |
| `--ink`, `--ink-2`, `--ink-3` | texto: principal, secundário, ajuda |
| `--line`, `--edge` | bordas e divisórias |
| `--danger` | erros e ações destrutivas |
| `--r-control` e demais `--r-*` | raios de canto |

## ✅ Checkpoint
Abra **http://localhost:3000/design-system**, troque claro/escuro no canto superior e confira: texto legível, botões com a sua cor, nada "estourado".

## ⚠️ Se der erro
- **Cor não mudou**: você editou só `:root` e está no tema escuro (ou o contrário). Edite os dois blocos.
- **Texto ilegível**: contraste baixo. Peça para a IA "ajustar para contraste AA".

### 🤖 Não resolveu? Peça ajuda para a IA
Rode `npm run diagnostico` e cole na sua IA (Claude, ChatGPT, Cursor) junto com:

```text
Estou instalando o template "Hub de Agentes de IA" e travei em: a troca do design system.
O que eu tentei fazer: [descreva]
Comando que rodei: [cole]
Mensagem de erro completa: [cole]
Diagnóstico (sem segredos): [cole a saída do npm run diagnostico]

Explique a causa em linguagem simples e me diga o passo exato para resolver.
Não me peça para colar chaves, tokens ou o .env.local aqui.
```

---

[← Rodar no seu computador](05-rodar-local.md) · [Índice](README.md) · [Inteligência e agentes →](07-inteligencia-e-agentes.md)
