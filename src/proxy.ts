import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { siteRedirect } from "@/lib/redirect"
import { withBase } from "@/lib/base-path"

/*
 * PROXY (o antigo middleware): renova a sessão do Supabase a cada
 * requisição e manda para /login quem não está logado.
 * É uma checagem otimista: status (ativo/bloqueado) e papel (admin)
 * são conferidos de novo no servidor, em requireUser/requireAdmin.
 */

const PUBLIC_PATHS = [
  "/login",
  "/esqueci-senha",
  "/auth",
  "/bloqueado",
  "/design-system",
  "/setup", // assistente de instalação: ele mesmo some depois que existe um admin
  "/api/setup",
  "/api/webhooks",
  "/api/cron",
]

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const path = request.nextUrl.pathname

  // Instalação recém-clonada, sem Supabase configurado: tudo leva ao assistente /setup
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (path === "/setup" || path.startsWith("/api/setup") || path.startsWith("/design-system")) return response
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Supabase não configurado. Abra /setup." }, { status: 503 })
    }
    // sem NEXT_PUBLIC_SITE_URL ainda: usa a origem da própria requisição (localhost em qualquer porta)
    return NextResponse.redirect(new URL(withBase("/setup"), request.nextUrl.origin), 307)
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  // getUser valida o token com o Supabase (não confia só no cookie)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`))

  if (!user && !isPublic) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 })
    }
    const target = path === "/" ? "/login" : `/login?next=${encodeURIComponent(path)}`
    return siteRedirect(target, 307, response)
  }

  if (user && path === "/login") {
    return siteRedirect("/", 307, response)
  }

  return response
}

export const config = {
  // tudo, menos arquivos estáticos e imagens
  // "/" precisa estar explícito para o proxy rodar na entrada (inclusive com basePath)
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
