/*
 * VALORES PÚBLICOS
 * Só o que pode aparecer no navegador. A chave anon é pública por
 * desenho: quem protege os dados é o RLS do Supabase.
 * O Next só embute NEXT_PUBLIC_* quando o nome aparece literal, por
 * isso cada variável é lida por extenso.
 */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
}
