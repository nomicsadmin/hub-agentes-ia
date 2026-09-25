/*
 * SINCRONIZA A PASTA agentes/ COM O BANCO
 *
 *   npm run agentes:sync            cria/atualiza agentes, prompts, documentos e temas
 *   npm run agentes:sync -- --dry   só mostra o que faria (não grava nada)
 *
 * Agente com "ativo": false fica desativado no banco (some do app; o
 * histórico das conversas é mantido). Agente que está no banco mas não tem
 * pasta só é desativado com --desativar-ausentes (nunca por padrão).
 *
 * Para cada agentes/<slug>/:
 *   agente.json   nome, descrição, ícone, atalhos, ordem, ativo, documentos
 *   prompt.md     instruções do agente (nova versão só se o texto mudou)
 *   conhecimento/ arquivos citados em "documentos" (PDF, DOCX, MD, TXT)
 * E agentes/_topicos.json para os temas do painel "Temas e dificuldades".
 *
 * Idempotente: pode rodar quantas vezes quiser. Não apaga nada que foi
 * criado pelo painel admin. Nunca imprime segredos nem o conteúdo dos arquivos.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { extname, join } from "node:path"
import { c, fail, supabaseAdmin } from "./lib/env.mjs"
import { estimateTokens, extractText, MIME_BY_EXT } from "./lib/extract.mjs"
import { chunkText } from "../src/lib/knowledge/chunk.ts"

const DRY = process.argv.includes("--dry")
const DEACTIVATE_MISSING = process.argv.includes("--desativar-ausentes")
const ROOT = "agentes"
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const FULL_CONTEXT_TOKEN_LIMIT = 80_000

if (!existsSync(ROOT)) fail("Pasta agentes/ não encontrada.", "Rode este comando na raiz do projeto.")

/* ── 1. Lê e valida a pasta ─────────────────────────────── */

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"))
  } catch (err) {
    fail(`JSON inválido em ${path}: ${err.message}`, "Confira vírgulas e aspas. Dica: cole o arquivo na IA e peça para corrigir o JSON.")
  }
}

const agents = []
for (const slug of readdirSync(ROOT).sort()) {
  const dir = join(ROOT, slug)
  if (slug.startsWith("_") || slug.startsWith(".") || !statSync(dir).isDirectory()) continue
  if (!SLUG.test(slug)) fail(`Nome de pasta inválido: agentes/${slug}`, "Use só letras minúsculas, números e hífens (ex.: mentor-de-vendas).")

  const cfgPath = join(dir, "agente.json")
  const promptPath = join(dir, "prompt.md")
  if (!existsSync(cfgPath)) fail(`Falta agentes/${slug}/agente.json`, "Copie o de agentes/agente-exemplo/ e ajuste.")
  if (!existsSync(promptPath)) fail(`Falta agentes/${slug}/prompt.md`, "Escreva as instruções do agente nesse arquivo.")

  const cfg = readJson(cfgPath)
  if (!cfg.nome?.trim()) fail(`agentes/${slug}/agente.json: "nome" é obrigatório.`)
  const prompt = readFileSync(promptPath, "utf8").trim()
  if (prompt.length < 20) fail(`agentes/${slug}/prompt.md está vazio ou curto demais.`)

  const docs = (cfg.documentos ?? []).map((d, i) => {
    if (!d.arquivo) fail(`agentes/${slug}/agente.json: documentos[${i}] sem "arquivo".`)
    const path = join(dir, d.arquivo)
    if (!existsSync(path)) fail(`Arquivo não encontrado: ${path}`, `Coloque o arquivo nessa pasta ou corrija o caminho em agente.json.`)
    const mime = MIME_BY_EXT[extname(path).toLowerCase()]
    if (!mime) fail(`Formato não suportado: ${path}`, "Use PDF, DOCX, MD ou TXT.")
    return {
      path,
      mime,
      title: (d.titulo || d.arquivo).trim(),
      priority: Number.isFinite(d.prioridade) ? d.prioridade : 10,
      storagePath: `agentes/${slug}/${d.arquivo.split("/").pop()}`,
    }
  })

  agents.push({
    slug,
    name: cfg.nome.trim(),
    description: (cfg.descricao ?? "").trim(),
    icon: cfg.icone || "robot",
    sort: Number.isFinite(cfg.ordem) ? cfg.ordem : 0,
    isActive: cfg.ativo !== false,
    starters: Array.isArray(cfg.atalhos) ? cfg.atalhos.map(String).slice(0, 6) : [],
    prompt,
    docs,
  })
}

if (agents.length === 0) fail("Nenhum agente em agentes/.", "Crie uma pasta como agentes/agente-exemplo/.")

const topicsCfg = existsSync(join(ROOT, "_topicos.json")) ? readJson(join(ROOT, "_topicos.json")) : { temas: [] }
const topics = [...new Set((topicsCfg.temas ?? []).map((t) => String(t).trim()).filter((t) => t && t !== "Outros"))]

console.log(c.bold(`\n${DRY ? "[simulação] " : ""}Sincronizando ${agents.length} agente(s) e ${topics.length} tema(s)\n`))

if (DRY) {
  for (const a of agents) {
    let tokens = 0
    for (const d of a.docs) {
      try {
        tokens += estimateTokens(await extractText(readFileSync(d.path), d.mime))
      } catch {
        console.log(c.warn(`${d.path}: não consegui ler`))
      }
    }
    const mode = tokens > FULL_CONTEXT_TOKEN_LIMIT ? "busca por trechos (RAG)" : "material inteiro no prompt"
    console.log(
      c.step(
        `${a.slug}: "${a.name}"${a.isActive ? "" : " (inativo)"} · ${a.docs.length} documento(s) · ` +
          `~${tokens.toLocaleString("pt-BR")} tokens → ${mode} · prompt com ${a.prompt.length} caracteres`
      )
    )
  }
  console.log(c.dim("\nNada foi gravado (--dry)."))
  process.exit(0)
}

/* ── 2. Grava no Supabase ────────────────────────────────── */

const supabase = await supabaseAdmin()

async function must(promise, what) {
  const { data, error } = await promise
  if (error) {
    const hint =
      error.code === "42P01" || /relation .* does not exist/i.test(error.message)
        ? "As tabelas ainda não existem. Rode as migrations: `npx supabase db push` (docs/03-supabase.md)."
        : undefined
    fail(`${what}: ${error.message}`, hint)
  }
  return data
}

async function embed(texts) {
  const key = process.env.OPENAI_API_KEY
  if (!key || texts.length === 0) return null
  const { default: OpenAI } = await import("openai")
  const client = new OpenAI({ apiKey: key })
  const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small"
  const out = []
  for (let i = 0; i < texts.length; i += 64) {
    const res = await client.embeddings.create({ model, input: texts.slice(i, i + 64) })
    for (const item of res.data) out.push(JSON.stringify(item.embedding))
  }
  return out
}

// temas
if (topics.length) {
  await must(
    supabase.from("topics").upsert(
      topics.map((name, i) => ({ name, sort: i + 1, is_active: true })),
      { onConflict: "name" }
    ),
    "Gravando temas"
  )
  console.log(c.ok(`Temas: ${topics.join(", ")} (+ Outros)`))
}

for (const a of agents) {
  // agente
  const agent = await must(
    supabase
      .from("agents")
      .upsert(
        { slug: a.slug, name: a.name, description: a.description, icon: a.icon, sort: a.sort, is_active: a.isActive, starters: a.starters },
        { onConflict: "slug" }
      )
      .select("id")
      .single(),
    `Gravando agente ${a.slug}`
  )

  // prompt: nova versão só se mudou
  const current = await must(
    supabase.from("agent_prompt_versions").select("id, content").eq("agent_id", agent.id).eq("is_current", true).maybeSingle(),
    "Lendo prompt atual"
  )
  let promptStatus = "sem mudança"
  if (!current || current.content.trim() !== a.prompt) {
    if (current) await must(supabase.from("agent_prompt_versions").update({ is_current: false }).eq("id", current.id), "Arquivando prompt anterior")
    await must(
      supabase
        .from("agent_prompt_versions")
        .insert({ agent_id: agent.id, content: a.prompt, note: "agentes:sync (prompt.md)", is_current: true }),
      "Gravando prompt"
    )
    promptStatus = current ? "nova versão" : "criado"
  }
  console.log(c.ok(`${a.name} (${a.slug})${a.isActive ? "" : " [inativo]"}: agente gravado, prompt ${promptStatus}`))

  // documentos
  let totalTokens = 0
  for (const d of a.docs) {
    const buffer = readFileSync(d.path)
    let content
    try {
      content = await extractText(buffer, d.mime)
    } catch (err) {
      fail(`Não consegui ler ${d.path}: ${err.message}`)
    }
    if (!content) {
      console.log(c.warn(`${d.path}: nenhum texto encontrado (PDF escaneado?). Pulei. Converta para texto (OCR) e rode de novo.`))
      continue
    }
    const tokens = estimateTokens(content)
    totalTokens += tokens

    const { error: upErr } = await supabase.storage.from("knowledge").upload(d.storagePath, buffer, { contentType: d.mime, upsert: true })
    if (upErr) fail(`Enviando ${d.path}: ${upErr.message}`, "Confira se o bucket `knowledge` existe (migrations aplicadas).")

    const existing = await must(
      supabase.from("knowledge_documents").select("id, content").eq("storage_path", d.storagePath).limit(1).maybeSingle(),
      "Procurando documento"
    )
    const changed = !existing || existing.content !== content
    const row = {
      title: d.title,
      storage_path: d.storagePath,
      mime: d.mime,
      status: "ready",
      content,
      token_estimate: tokens,
      error: null,
      updated_at: new Date().toISOString(),
    }
    const documentId = existing
      ? (await must(supabase.from("knowledge_documents").update(row).eq("id", existing.id).select("id").single(), "Atualizando documento")).id
      : (await must(supabase.from("knowledge_documents").insert(row).select("id").single(), "Criando documento")).id

    await must(
      supabase
        .from("agent_documents")
        .upsert({ agent_id: agent.id, document_id: documentId, priority: d.priority }, { onConflict: "agent_id,document_id" }),
      "Vinculando documento"
    )

    // trechos para a busca (RAG, usada só quando a base passa de ~80 mil tokens)
    let chunkInfo = "trechos sem mudança"
    if (changed) {
      const chunks = chunkText(content)
      const embeddings = await embed(chunks)
      await must(supabase.from("knowledge_chunks").delete().eq("document_id", documentId), "Limpando trechos")
      for (let i = 0; i < chunks.length; i += 100) {
        const rows = chunks.slice(i, i + 100).map((text, j) => ({
          document_id: documentId,
          chunk_index: i + j,
          content: text,
          embedding: embeddings ? embeddings[i + j] : null,
        }))
        await must(supabase.from("knowledge_chunks").insert(rows), "Gravando trechos")
      }
      chunkInfo = `${chunks.length} trechos${embeddings ? "" : " (sem embedding: falta OPENAI_API_KEY)"}`
    }
    console.log(c.dim(`    · "${d.title}" · ~${tokens.toLocaleString("pt-BR")} tokens · prioridade ${d.priority} · ${chunkInfo}`))
  }

  const mode = totalTokens > FULL_CONTEXT_TOKEN_LIMIT ? "busca por trechos (RAG)" : "material inteiro no prompt"
  console.log(c.dim(`    Base: ~${totalTokens.toLocaleString("pt-BR")} tokens → ${mode}`))
}

// agentes que existem no banco mas não têm pasta: só AVISA. Desativar exige a opção explícita
// --desativar-ausentes (evita desligar agentes criados de outro jeito ou de outro projeto).
const slugs = new Set(agents.map((a) => a.slug))
const inDb = await must(supabase.from("agents").select("id, slug, is_active"), "Lendo agentes do banco")
const orphans = inDb.filter((row) => !slugs.has(row.slug) && row.is_active)
for (const row of orphans) {
  if (DEACTIVATE_MISSING) {
    await must(supabase.from("agents").update({ is_active: false }).eq("id", row.id), "Desativando agente")
    console.log(c.warn(`${row.slug}: sem pasta em agentes/, desativado no banco (o histórico foi mantido).`))
  } else {
    console.log(c.warn(`${row.slug}: está ativo no banco mas não tem pasta em agentes/ (mantido como está).`))
  }
}
if (orphans.length && !DEACTIVATE_MISSING) {
  console.log(c.dim("    Para desativar esses agentes: npm run agentes:sync -- --desativar-ausentes"))
}

console.log(c.bold("\nPronto! Abra o app e converse com os agentes.\n"))
