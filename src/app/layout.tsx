import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";
import { withBase } from "@/lib/base-path";
import { appConfig } from "@/config/app.config";


export const metadata: Metadata = {
  title: { default: appConfig.name, template: `%s · ${appConfig.name}` },
  description: appConfig.description,
  applicationName: appConfig.name,
  appleWebApp: { capable: true, title: appConfig.shortName, statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: withBase("/icons/icon.svg"), type: "image/svg+xml" },
      { url: withBase("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: withBase("/icons/apple-touch-icon.png"), sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: appConfig.themeColor.light },
    { media: "(prefers-color-scheme: dark)", color: appConfig.themeColor.dark },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={appConfig.locale} className="h-full" suppressHydrationWarning>
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
