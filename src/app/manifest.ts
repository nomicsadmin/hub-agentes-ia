import type { MetadataRoute } from "next"
import { appConfig } from "@/config/app.config"
import { withBase } from "@/lib/base-path"

/* PWA: "Adicionar à tela inicial". Nome e cores vêm de app.config.ts. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appConfig.name,
    short_name: appConfig.shortName,
    description: appConfig.description,
    lang: appConfig.locale,
    dir: "ltr",
    id: withBase("/"),
    start_url: withBase("/chat"),
    scope: withBase("/"),
    display: "standalone",
    orientation: "portrait",
    background_color: appConfig.themeColor.light,
    theme_color: appConfig.themeColor.light,
    categories: ["education", "productivity"],
    icons: [
      { src: withBase("/icons/icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: withBase("/icons/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: withBase("/icons/icon-maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: withBase("/icons/icon.svg"), sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  }
}
