import type { Metadata } from "next";
// Inter variable, autohospedada: la CSP declara font-src 'self', así que una
// fuente servida desde un CDN externo quedaría bloqueada.
import "@fontsource-variable/inter";
import "./globals.css";
import { idiomaActual } from "../lib/idiomaServidor";
import { textos } from "../lib/textos";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function generateMetadata(): Metadata {
  const { meta } = textos(idiomaActual());
  return {
    metadataBase: new URL(siteUrl),
    title: { default: meta.titulo, template: "%s | RIMPILOT" },
    description: meta.descripcion,
    applicationName: "RIMPILOT",
    // La landing sí se indexa; el libro lo desactiva en su propia metadata,
    // porque ahí sí hay datos financieros de una persona.
    robots: { index: true, follow: true },
    openGraph: {
      type: "website", siteName: "RIMPILOT", locale: meta.locale,
      title: meta.titulo, description: meta.descripcion, url: siteUrl,
    },
    twitter: { card: "summary_large_image", title: meta.titulo, description: meta.descripcion },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // El `lang` sigue al idioma elegido: un lector de pantalla pronuncia el
  // inglés con voz inglesa y el español con voz española.
  return <html lang={idiomaActual()}><body>{children}</body></html>;
}
