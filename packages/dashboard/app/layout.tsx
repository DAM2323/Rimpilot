import type { Metadata } from "next";
// Inter variable, autohospedada: la CSP declara font-src 'self', así que una
// fuente servida desde un CDN externo quedaría bloqueada.
import "@fontsource-variable/inter";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const descripcion = "Libro contable por voz para vendedores informales: contás tu día hablando y Wari lo ordena, incluida la plata que sacaste de la caja.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "RIMPILOT | Tu caja, clara", template: "%s | RIMPILOT" },
  description: descripcion,
  applicationName: "RIMPILOT",
  // El panel muestra datos financieros de una persona: no se indexa nunca.
  robots: { index: false, follow: false, nocache: true },
  openGraph: {
    type: "website", siteName: "RIMPILOT", locale: "es_PE",
    title: "RIMPILOT | Tu caja, clara", description: descripcion, url: siteUrl,
  },
  twitter: { card: "summary_large_image", title: "RIMPILOT | Tu caja, clara", description: descripcion },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
