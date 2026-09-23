import type { MetadataRoute } from "next";

/**
 * La landing sí se indexa: es la puerta pública y explica qué es RIMPILOT.
 * El libro no, y no por omisión: `/libro` muestra la contabilidad y las
 * transcripciones de una persona real, así que se prohíbe el rastreo explícito.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/libro", "/api"] }],
  };
}
