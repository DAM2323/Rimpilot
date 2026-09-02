import type { RawData } from "ws";

/**
 * `ws` entrega los frames como Buffer, ArrayBuffer o Buffer[] según cómo llegue
 * la fragmentación. Llamar a `.toString()` sobre el array produce
 * "[object Object]" y el JSON se pierde en silencio.
 */
export function textoDeFrame(raw: RawData): string {
  if (Array.isArray(raw)) return Buffer.concat(raw).toString("utf8");
  if (Buffer.isBuffer(raw)) return raw.toString("utf8");
  return Buffer.from(raw).toString("utf8");
}
