import type { Idioma } from "../lib/idioma";
import { textos } from "../lib/textos";

/**
 * ES / EN. Son enlaces comunes —`<a>`, no `<Link>`— para que Next no los
 * precargue: precargar un enlace que guarda una cookie la cambiaría sola.
 * Cada opción se nombra en su propio idioma, con su `lang`, para que un lector
 * de pantalla la pronuncie bien. El nombre accesible empieza con lo que se ve
 * ("ES", "EN"): quien maneja la página por voz dice lo que lee.
 */
export function SelectorIdioma({ idioma, volver }: { idioma: Idioma; volver: string }) {
  const t = textos(idioma).selector;
  const opciones: Array<{ codigo: Idioma; nombre: string }> = [
    { codigo: "es", nombre: t.es },
    { codigo: "en", nombre: t.en },
  ];
  return <nav className="selector-idioma" aria-label={t.etiqueta}>
    {opciones.map(({ codigo, nombre }) => (
      <a
        key={codigo}
        href={`/api/idioma?a=${codigo}&volver=${encodeURIComponent(volver)}`}
        lang={codigo}
        hrefLang={codigo}
        aria-current={codigo === idioma ? "true" : undefined}
      >{codigo.toUpperCase()}<span className="solo-lector"> {nombre}</span></a>
    ))}
  </nav>;
}
