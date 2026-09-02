import type { MetadataRoute } from "next";

/**
 * El panel muestra el libro contable de una persona. No hay nada que indexar:
 * se prohíbe el rastreo completo, no solo se omite del sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
