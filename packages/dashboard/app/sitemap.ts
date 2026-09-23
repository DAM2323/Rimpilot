import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Solo las dos páginas públicas. `/entrar` queda afuera a propósito: no aporta
 * nada a quien llega de una búsqueda, y ya va marcada como no indexable.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/crear-cuenta`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];
}
