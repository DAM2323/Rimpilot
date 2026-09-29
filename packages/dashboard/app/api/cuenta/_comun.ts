import type { NextResponse } from "next/server";
import { redirigir } from "../../../lib/redirigir";
import { COOKIE_SESION, crearSesion, opcionesCookie } from "../../../lib/sesion";
import type { CodigoError } from "../../../lib/textos";

/**
 * Las cuatro rutas de cuenta responden con una redirección, no con JSON: los
 * formularios son HTML puro y andan sin una línea de JavaScript, que es lo que
 * conviene cuando la CSP prohíbe scripts inline y el vendedor puede estar en un
 * teléfono con mala señal.
 *
 * El error viaja como código, no como frase: la página lo muestra en el idioma
 * de quien la mira, y un texto inventado en `?error=` no se muestra nunca.
 */
export function aError(ruta: string, codigo: CodigoError, volver?: string | null): NextResponse {
  const parametros = new URLSearchParams({ error: codigo });
  // Si venía de un enlace profundo, no se pierde al fallar el primer intento.
  if (volver) parametros.set("volver", volver);
  return redirigir(`${ruta}?${parametros.toString()}`);
}

/**
 * A dónde mandar a alguien después de entrar.
 *
 * Solo se aceptan rutas del propio libro. Sin este filtro, `?volver=` sería un
 * redirect abierto: bastaría un enlace a `/entrar?volver=https://otro-sitio`
 * para que la persona entre en RIMPILOT y aterrice en una copia del panel
 * pidiéndole la contraseña de nuevo.
 */
export function destinoSeguro(volver: unknown): string {
  if (typeof volver !== "string") return "/libro";
  // `/libro` o algo dentro de `/libro/`, nada más. Con un `startsWith("/libro")`
  // a secas, `/librotrampa` también pasaba.
  if (volver !== "/libro" && !volver.startsWith("/libro/")) return "/libro";
  // `//otro-sitio` y `/\otro-sitio` son URLs absolutas para el navegador.
  if (volver.includes("\\")) return "/libro";
  return volver;
}

export async function entrarAlLibro(vendedorId: string, volver?: unknown): Promise<NextResponse> {
  const respuesta = redirigir(destinoSeguro(volver));
  respuesta.cookies.set(COOKIE_SESION, await crearSesion(vendedorId), opcionesCookie());
  return respuesta;
}
