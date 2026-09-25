/*
 * CAMINHO BASE (opcional)
 * Por padrão o app vive na raiz do domínio (ex.: meuhub.com.br).
 * Para servir em um subcaminho (ex.: meusite.com.br/agentes, via
 * Multi-Zones), defina NEXT_PUBLIC_BASE_PATH=/agentes e rode o build de novo.
 * O Next aplica o basePath sozinho em <Link>, router e redirect(); o resto
 * (fetch, <a>, <form>, <img>, ícones) passa por withBase.
 */
const raw = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim().replace(/\/+$/, "")
export const BASE_PATH = raw && !raw.startsWith("/") ? `/${raw}` : raw

export function withBase(path: string) {
  if (!BASE_PATH || !path.startsWith("/")) return path
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)) return path
  return `${BASE_PATH}${path}`
}
