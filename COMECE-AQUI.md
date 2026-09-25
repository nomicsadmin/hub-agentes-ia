# COMECE AQUI · Roteiro para a IA montar o seu hub

> **Você é uma pessoa?** Não precisa ler este arquivo inteiro. Abra o projeto no Claude Code (ou Cursor/Codex), coloque seus materiais na pasta `meus-materiais/` e cole na IA:
>
> **`Leia o COMECE-AQUI.md e monte o meu hub de agentes.`**
>
> A IA vai te fazer perguntas, mostrar o que entendeu e só mudar algo depois que você aprovar.

---

## Para a IA: como conduzir

Você vai montar um **hub de agentes de IA personalizado** para uma pessoa que provavelmente **não é técnica**. O código já está pronto: login, chat, admin, pagamento, métricas. O seu trabalho é **entender o negócio dela, transformar os materiais em agentes e configurar tudo**, do jeito que está descrito abaixo.

### Mapa: etapas deste roteiro × passos do /setup e da docs
| Etapa (aqui) | Passo no `/setup` e no `npm run setup:check` | Guia |
|---|---|---|
| 1 · Entrevista, 2 · Materiais, 3 · Agentes | Passo 7 · Seus agentes | docs/07 |
| 4 · Visual | Passo 6 · Seu design | docs/06 |
| 5 · Configuração técnica | Passos 2 a 5 (contas, Supabase, OpenAI, rodar) | docs/02 a 05 |
| 6 · Teste dos agentes | Passo 7 | docs/07 |
| 7 · Publicar | Passo 8 (e pagamento, opcional) | docs/08 e 09 |

### Regras que valem o tempo todo
0. **Fale no idioma da pessoa.** Se ela escrever em inglês (ou pedir), conduza tudo em inglês; os guias em `docs/` estão em português e você os explica no idioma dela.
1. **Uma decisão de cada vez.** Pergunte com opções de múltipla escolha, com a recomendada em primeiro lugar. Se a sua ferramenta tiver um recurso de perguntas com opções, use.
2. **Linguagem simples.** Nada de jargão sem explicar. Se precisar de um termo técnico, explique em uma frase (use `docs/glossario.md`).
3. **Mostre antes de fazer.** Antes de criar ou alterar arquivos, diga o que vai fazer e espere o "pode".
4. **Nunca peça chaves no chat.** Chaves (Supabase, OpenAI, tokens) são coladas **pela pessoa** no arquivo `.env.local` ou digitadas no terminal via `npm run setup`. Se ela colar uma chave no chat, avise que a chave deve ser trocada (rotacionada) depois.
5. **Não invente conteúdo do método.** Tudo o que os agentes sabem vem dos materiais. Onde o material for vago, pergunte ou registre como lacuna.
6. **Travou? Diagnostique.** Rode `npm run setup:check` ou `npm run diagnostico` e leia o resultado antes de sugerir qualquer coisa.
7. **Não toque em `supabase/migrations/` já existentes** nem em `src/lib/env.server.ts` sem necessidade. Siga `AGENTS.md` e `docs/11-seguranca.md`.

### Etapa 1 · Entrevista (não crie nada ainda)
Descubra, uma pergunta por vez:
- Nome do hub (ex.: "Hub da Academia X") e uma frase do que ele faz.
- Para quem é e como chamar essas pessoas (aluno/aluna/membro/cliente/mentorado) e o gênero do termo.
- Contexto do negócio em uma frase (ex.: "um curso de confeitaria", "uma mentoria de vendas").
- Quantos agentes no lançamento e o foco de cada um (dica: 1 a 3 agentes, cada um especialista em um assunto).
- Tom de voz (mentor direto, acolhedor e didático, técnico e objetivo, ou a voz de uma pessoa específica).
- Vai vender acesso? Por qual plataforma (Hubla já vem pronta; outras exigem um adaptador, ver `docs/08-pagamento.md`) ou só convite manual?
- Recursos: áudio, anexos (PDF/imagem) e PDF gerado pelo agente já vêm prontos. O áudio precisa de um modelo de transcrição (docs/04). Para desligar anexos ou PDF, basta colocar o limite diário em 0 em **Admin > Configurações** depois.

Resuma as respostas numa lista curta e peça confirmação.

### Etapa 2 · Leitura dos materiais
- Leia **tudo** em `meus-materiais/` (PDFs página por página, se forem grandes).
- Para cada material, explique em linguagem simples **o que entendeu** (estrutura, fases, números, regras).
- Aponte **lacunas** (termos citados e nunca explicados) e **conflitos** entre materiais (ex.: dois números diferentes para a mesma coisa) e pergunte qual vale.
- Estime o tamanho (~4 caracteres = 1 token). Até ~80 mil tokens por agente o material vai inteiro no prompt; acima disso o app usa busca por trechos sozinho.
- Pergunte quais materiais vão para qual agente e qual tem **prioridade** em caso de conflito.

### Etapa 3 · Rascunho dos agentes (mostrar e aprovar)
Para cada agente, crie a pasta `agentes/<slug>/` copiando `agentes/agente-exemplo/`:
- `agente.json`: nome, descrição, ícone (lista no próprio arquivo), 3 atalhos (perguntas prontas), documentos com prioridade.
- `prompt.md`: papel, tom, regras, o que responde e o que não responde, as lacunas conhecidas ("se perguntarem X, diga que não está no material") e qual material vence nos conflitos. Use `agentes/agente-exemplo/prompt.md` como modelo.
- Copie os materiais daquele agente para `agentes/<slug>/conhecimento/` (essa pasta **não vai para o GitHub**).
- Atualize `agentes/_topicos.json` com 10 a 20 temas do material (eles alimentam o painel **Temas e dificuldades**).
- O agente de exemplo: deixe `"ativo": false` no `agente.json` dele (o `agentes:sync` desativa no banco). Se apagar a pasta, rode `npm run agentes:sync -- --desativar-ausentes` para desativar no banco os agentes sem pasta.

Mostre um resumo em linguagem simples de cada agente e espere aprovação.

### Etapa 4 · Visual (marca)
- Se ainda não fez: rode `npm install` e `npm run dev` (a vitrine `/design-system` funciona mesmo sem Supabase).
- Edite `src/config/app.config.ts`: nome, nome curto, descrição, contexto, termo do público, cores do navegador, e-mail de suporte.
- Se a pessoa tiver logo, cores ou um print de referência em `meus-materiais/`, ajuste os tokens em `src/app/globals.css` (bloco "SEU DESIGN SYSTEM", claro em `:root` e escuro em `.dark`) seguindo `docs/06-design-system.md`. Mantenha contraste AA.
- Troque os ícones em `public/icons/` se houver logo (192, 512, maskable 512, apple-touch 180, svg).
- Troque "Hub de Agentes" pelo nome do hub em `supabase/templates/invite.html` e `recovery.html` (e cole no Supabase na Etapa 5).
- Atualize `DESIGN.md` com as regras do novo visual.
- Peça para a pessoa abrir `/design-system` e aprovar.

### Etapa 5 · Configuração técnica guiada (clique a clique)
Conduza na ordem, explicando **o que é, para que serve e quanto custa** cada conta (tabela em `docs/02-pre-requisitos.md`). Depois de cada passo, rode `npm run setup:check` ou peça para a pessoa abrir `/setup` e clicar em "Verificar de novo".
1. `npm install` (se ainda não rodou).
2. **Supabase**: criar o projeto ([docs/03-supabase.md](docs/03-supabase.md)), depois `npm run setup` (a pessoa cola as chaves no terminal, sem passar pelo chat), depois `npx supabase login`, `npx supabase link` e `npx supabase db push`.
   - **Obrigatório:** desligar **Allow new users to sign up** (docs/03, item 4). Sem isso, qualquer pessoa entra de graça.
   - Configurar URLs de redirecionamento e colar os e-mails de convite/senha.
3. **OpenAI**: chave e modelo ([docs/04-openai.md](docs/04-openai.md)) via `npm run setup`. Ele também pergunta o modelo de transcrição (áudio); se a pessoa não souber, deixe vazio e volte depois.
4. `npm run agentes:sync` (envia agentes, prompts, materiais e temas para o banco).
5. `npm run dev` e deixe rodando.
6. Em outro terminal: `npm run admin:criar -- email@da-pessoa.com "Nome"` e abrir o link que aparecer para criar a senha. Depois, `http://localhost:3000`.
> O `.env.local` é um arquivo oculto. No Claude Code/VS Code ele aparece na lista de arquivos; no Finder do Mac, `Cmd+Shift+.` mostra arquivos ocultos. Prefira sempre o `npm run setup`.

### Etapa 6 · Teste dos agentes
Para cada agente, peça para a pessoa (ou faça você, se tiver navegador) enviar:
- uma pergunta que o material responde (a resposta tem que bater com o material);
- uma pergunta sobre uma **lacuna** (o agente tem que admitir que não está no material);
- uma pergunta de **conflito** (tem que valer o material de maior prioridade, ou a regra escrita no `prompt.md` quando o conflito é dentro do mesmo documento).
Se errar, ajuste `prompt.md` e rode `npm run agentes:sync` de novo. Correções pontuais também podem ser feitas sem código no painel **Admin > Agentes > Correções**.

### Etapa 7 · Publicar
Siga [docs/09-deploy-vercel.md](docs/09-deploy-vercel.md): repositório **privado** no GitHub, importar na Vercel, variáveis de ambiente, domínio, atualizar `NEXT_PUBLIC_SITE_URL` e as URLs no Supabase. Se for vender, configure o webhook ([docs/08-pagamento.md](docs/08-pagamento.md)) e teste com `npm run webhook:teste`.

No final, entregue um resumo com: link do app, e-mail do admin, onde editar cada coisa depois (painel admin vs. arquivos) e o próximo passo recomendado.
