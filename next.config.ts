import type { NextConfig } from "next";
import { BASE_PATH } from "./src/lib/base-path";

/*
 * CABEÇALHOS DE SEGURANÇA
 * CSP: o navegador só conversa com o próprio app e com o Supabase.
 * A OpenAI é chamada só pelo servidor, então nem aparece aqui.
 */
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWs = supabase.replace(/^https:/, "wss:");
const dev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`,
  `media-src 'self' blob: ${supabase}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${supabaseWs}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // microfone e câmera só no próprio app (áudio e fotos no chat)
  { key: "Permissions-Policy", value: "microphone=(self), camera=(self), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // vazio = raiz do domínio; veja NEXT_PUBLIC_BASE_PATH no .env.example
  basePath: BASE_PATH,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // domínios extras que podem enviar formulários (só necessário com
      // Multi-Zones ou proxy na frente). Ex.: ALLOWED_ORIGINS=meusite.com.br
      allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
