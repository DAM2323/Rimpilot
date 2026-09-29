/**
 * En qué idioma se muestra RIMPILOT.
 *
 * El producto es para vendedores del Perú y su idioma es el español. El inglés
 * existe para que cualquiera pueda probarlo —un jurado, alguien de otro país—
 * sin adivinar qué dice cada botón.
 *
 * Gana la elección explícita (la cookie que deja el selector ES/EN). Si no hay,
 * se mira el idioma del navegador: quien lo tiene en español ve español, quien
 * lo tiene en cualquier otro idioma ve inglés. Sin ninguna pista —un bot, la
 * vista previa de un enlace en lablab o en un chat— sale en inglés: esa vista
 * previa es lo primero que ve un jurado, y ningún navegador de una persona
 * llega sin `Accept-Language`.
 *
 * Este archivo no importa nada de Next para poder probarlo solo.
 */
export type Idioma = "es" | "en";

export const IDIOMAS: readonly Idioma[] = ["es", "en"];
export const COOKIE_IDIOMA = "rimpilot_idioma";

export function esIdioma(valor: unknown): valor is Idioma {
  return valor === "es" || valor === "en";
}

/** El idioma preferido de una cabecera `Accept-Language`, respetando los `q`. */
function idiomaDelNavegador(cabecera: string | null | undefined): Idioma | null {
  if (!cabecera) return null;
  const preferidos = cabecera.split(",")
    .map((parte, orden) => {
      const [etiqueta, ...parametros] = parte.trim().split(";");
      const q = parametros.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const peso = q ? Number(q.slice(2)) : 1;
      return { base: etiqueta.trim().toLowerCase().split("-")[0], peso: Number.isFinite(peso) ? peso : 0, orden };
    })
    .filter(({ base, peso }) => base && base !== "*" && peso > 0)
    .sort((a, b) => b.peso - a.peso || a.orden - b.orden);
  if (!preferidos.length) return null;
  return preferidos[0].base === "es" ? "es" : "en";
}

export function idiomaDe(cookie: string | null | undefined, acceptLanguage: string | null | undefined): Idioma {
  if (esIdioma(cookie)) return cookie;
  return idiomaDelNavegador(acceptLanguage) ?? "en";
}

/**
 * A dónde volver después de cambiar de idioma. Solo rutas del propio sitio:
 * sin este filtro, `/api/idioma?volver=https://otro-sitio` sería un redirect
 * abierto con el dominio de RIMPILOT como carnada.
 */
export function volverSeguro(volver: unknown): string {
  if (typeof volver !== "string" || !volver.startsWith("/")) return "/";
  // `//otro-sitio` y `/\otro-sitio` son URLs absolutas para el navegador.
  if (volver.startsWith("//") || volver.includes("\\")) return "/";
  return volver;
}
