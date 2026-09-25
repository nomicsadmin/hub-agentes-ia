import "server-only"
import { z } from "zod"

/*
 * SEGREDOS DO SERVIDOR
 * "server-only" faz o build falhar se um componente do navegador
 * importar este arquivo. Nenhuma destas variáveis pode começar com
 * NEXT_PUBLIC_ (o Next copiaria o valor para o navegador).
 */

const schema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  OPENAI_API_KEY: z.string().min(20).optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-6-luna"),
  OPENAI_TRANSCRIBE_MODEL: z.string().optional(),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  HUBLA_WEBHOOK_TOKEN: z.string().min(8).optional(),
  HUBLA_PRODUCT_IDS: z.string().optional(),
  CRON_SECRET: z.string().min(16).optional(),
})

const SECRET_NAMES = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "HUBLA_WEBHOOK_TOKEN",
  "CRON_SECRET",
  "SUPABASE_DB_PASSWORD",
]

for (const name of SECRET_NAMES) {
  if (process.env[`NEXT_PUBLIC_${name}`]) {
    throw new Error(`NEXT_PUBLIC_${name} expõe um segredo no navegador. Remova o prefixo NEXT_PUBLIC_.`)
  }
}

// linha "CHAVE=" no .env.local chega como texto vazio: tratar como ausente
const env = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v.trim() !== ""))

const parsed = schema.safeParse(env)
if (!parsed.success) {
  const faltando = parsed.error.issues.map((i) => i.path.join(".")).join(", ")
  throw new Error(`Variáveis de ambiente do servidor inválidas ou ausentes: ${faltando}. Confira o .env.local.`)
}

export const serverEnv = parsed.data

/* Exige um segredo opcional no momento em que ele é usado. */
export function requireSecret<K extends keyof typeof serverEnv>(key: K): NonNullable<(typeof serverEnv)[K]> {
  const value = serverEnv[key]
  if (!value) throw new Error(`${String(key)} não está configurada no .env.local.`)
  return value as NonNullable<(typeof serverEnv)[K]>
}
