# 07 · Inteligência e agentes

> Criar agentes a partir dos seus materiais, escrever bons prompts e testar. ⏱ 30 min por agente · 🧰 seus PDFs, apostilas ou transcrições.

## Como um agente é organizado
```text
agentes/
  _topicos.json                  temas do painel "Temas e dificuldades"
  mentor-de-vendas/              o nome da pasta é o identificador (slug)
    agente.json                  nome, descrição, ícone, atalhos, documentos
    prompt.md                    instruções (papel, tom, regras)
    conhecimento/                seus materiais (não vão para o GitHub)
      apostila.pdf
      aula-3-transcricao.md
```
Depois de criar ou mudar qualquer coisa:
```bash
npm run agentes:sync
```
Ele só grava uma nova versão do prompt se o texto mudou e pode rodar quantas vezes quiser. Agente com `"ativo": false` fica **desativado** no banco: some do app, mas o histórico das conversas é mantido. Apagou a pasta de um agente? Rode `npm run agentes:sync -- --desativar-ausentes` (por segurança, o sync nunca desativa nada sem essa opção).

## `agente.json`
```json
{
  "nome": "Mentor de Vendas",
  "descricao": "Aplica o método de vendas ao seu negócio, passo a passo.",
  "icone": "target",
  "ordem": 1,
  "ativo": true,
  "atalhos": ["Por onde eu começo?", "Monte meu script de vendas", "Analise minha oferta"],
  "documentos": [
    { "arquivo": "conhecimento/apostila.pdf", "titulo": "Apostila do Método", "prioridade": 10 },
    { "arquivo": "conhecimento/aula-3-transcricao.md", "titulo": "Aula 3", "prioridade": 5 }
  ]
}
```
**Prioridade:** quando dois documentos discordam, vale o de número maior.

## Um bom `prompt.md` tem
1. **Papel**: "Você é o Mentor de Vendas, especialista no Método X."
2. **Tom**: mentor direto, acolhedor, técnico... e "fale por você, respostas curtas para celular".
3. **Regras**: responder só com o material; "Isso não está no material" quando não souber; não inventar números, datas ou promessas; terminar com o próximo passo.
4. **Lacunas conhecidas**: "o material cita X mas não explica; se perguntarem, diga que não está no material".
5. **Conflitos**: "sobre Y vale o documento A, não o B".
6. **O que NÃO faz**: fora do tema, promessas de resultado.

Modelo pronto: `agentes/agente-exemplo/prompt.md`.

## Formatos aceitos
PDF (com texto; PDF escaneado precisa de OCR antes), DOCX, MD e TXT. Vídeo e áudio: transcreva antes e salve como TXT/MD.

## Tamanho da base
- Até ~80 mil tokens por agente (~200 a 250 páginas): o material vai inteiro em cada pergunta. Mais preciso.
- Acima: o app troca sozinho para busca por trechos (RAG). O `agentes:sync` (inclusive o `-- --dry`) mostra o tamanho e o modo de cada agente.

## Ajustes sem código (painel admin)
**Admin > Agentes > [agente]**:
- **Prompt**: edite e salve (tem histórico e botão de restaurar).
- **Correções**: regras com prioridade máxima ("quando perguntarem X, responda Y").
- **Documentos**: suba, troque a prioridade ou tire documentos.
- **Avaliações**: respostas que receberam 👎, com atalho para virar correção.

> O que você muda no painel fica no banco. Se depois rodar `agentes:sync` com um `prompt.md` diferente, ele cria uma nova versão com o texto do arquivo. Escolha um lugar como "fonte da verdade".

## ✅ Checkpoint: teste de cada agente
1. Uma pergunta que o material responde: a resposta bate com o material.
2. Uma pergunta sobre uma lacuna: o agente diz que não está no material.
3. Uma pergunta de conflito: vale o documento de maior prioridade. Se o conflito for **dentro do mesmo documento**, escreva no `prompt.md` qual regra vale.

## ⚠️ Se der erro
- **"nenhum texto encontrado (PDF escaneado?)"**: o PDF é imagem. Passe por um OCR (ex.: no Google Drive, abra com Google Docs) e salve como PDF ou DOCX.
- **JSON inválido**: faltou vírgula ou aspas. Cole o arquivo na IA e peça para corrigir.
- **O agente inventa**: reforce no `prompt.md` "responda só com base no material" e adicione uma **Correção** no admin.

### 🤖 Não resolveu? Peça ajuda para a IA
Rode `npm run diagnostico` e cole na sua IA (Claude, ChatGPT, Cursor) junto com:

```text
Estou instalando o template "Hub de Agentes de IA" e travei em: a criação dos agentes.
O que eu tentei fazer: [descreva]
Comando que rodei: [cole]
Mensagem de erro completa: [cole]
Diagnóstico (sem segredos): [cole a saída do npm run diagnostico]

Explique a causa em linguagem simples e me diga o passo exato para resolver.
Não me peça para colar chaves, tokens ou o .env.local aqui.
```

---

[← Seu design system](06-design-system.md) · [Índice](README.md) · [Pagamento →](08-pagamento.md)
