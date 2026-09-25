# Glossário

Termos técnicos em uma linha, sem enrolação.

| Termo | O que é |
|---|---|
| **Repositório (repo)** | A pasta do projeto guardada no GitHub, com o histórico de mudanças. |
| **Terminal** | A janela onde você digita comandos (`npm run dev`). No Claude Code, a IA pode rodar por você. |
| **npm** | O instalador de pacotes do Node.js. `npm install` baixa tudo o que o projeto precisa. |
| **Variável de ambiente** | Uma configuração guardada fora do código (ex.: a chave da OpenAI). Fica no `.env.local`. |
| **`.env.local`** | O arquivo com as suas chaves. Fica só no seu computador e nunca vai para o GitHub. |
| **Chave de API / token** | Uma senha que um programa usa para falar com outro serviço. Trate como senha. |
| **Supabase** | O serviço que guarda o banco de dados, os logins e os arquivos. |
| **Migration** | Um arquivo que cria ou muda as tabelas do banco. `npx supabase db push` aplica. |
| **RLS** | Regra do banco que faz cada pessoa ver só os próprios dados. |
| **Service role** | A chave "mestra" do Supabase, que ignora o RLS. Só o servidor usa. |
| **Deploy** | Publicar o app na internet (aqui, na Vercel). |
| **Webhook** | Um aviso automático que uma plataforma manda para o seu app (ex.: "compra aprovada"). |
| **Prompt** | As instruções que dizem ao agente quem ele é e como deve responder. |
| **Token (IA)** | Pedaço de texto que a IA conta para cobrar (em português, ~4 caracteres). |
| **Streaming** | A resposta aparecendo aos poucos, enquanto a IA escreve. |
| **RAG** | Busca por trechos: em vez do material inteiro, a IA recebe só as partes relevantes. |
| **Embedding** | Uma "impressão digital" numérica de um texto, usada para achar trechos parecidos. |
| **PWA** | Um site que pode ser instalado no celular como aplicativo ("Adicionar à tela inicial"). |
| **Design system** | O conjunto de cores, fontes, espaçamentos e componentes que dá a cara do app. |
| **Token (design)** | Uma variável de estilo, como `--ink` (cor do texto) ou `--r-control` (raio do canto). |
| **Slug** | Um nome curto sem espaços usado como identificador (ex.: `mentor-de-vendas`). |
