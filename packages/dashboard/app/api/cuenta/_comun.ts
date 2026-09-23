import { NextResponse } from "next/server";
import { COOKIE_SESION, crearSesion, opcionesCookie } from "../../../lib/sesion";

/**
 * Las cuatro rutas de cuenta responden con una redirección, no con JSON: los
 * formularios son HTML puro y andan sin una línea de JavaScript, que es lo que
 * conviene cuando la CSP prohíbe scripts inline y el vendedor puede estar en un
 * teléfono con mala señal.
 */
export function aError(origen: string, ruta: string, mensaje: string, volver?: string | null): NextResponse {
  const url = new URL(ruta, origen);
  url.searchParams.set("error", mensaje);
  // Si venía de un enlace profundo, no se pierde al fallar el primer intento.
  if (volver) url.searchParams.set("volver", volver);
  return NextResponse.redirect(url, { status: 303 });
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

export async function entrarAlLibro(origen: string, vendedorId: string, volver?: unknown): Promise<NextResponse> {
  const respuesta = NextResponse.redirect(new URL(destinoSeguro(volver), origen), { status: 303 });
  respuesta.cookies.set(COOKIE_SESION, await crearSesion(vendedorId), opcionesCookie());
  return respuesta;
}
