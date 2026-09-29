import type { NextResponse } from "next/server";
import { COOKIE_IDIOMA, esIdioma, volverSeguro } from "../../../lib/idioma";
import { redirigir } from "../../../lib/redirigir";

/**
 * Cambia el idioma y vuelve a la página donde estaba la persona.
 *
 * Es un enlace (GET) y no un formulario porque no toca datos de nadie: solo
 * guarda una preferencia de lectura. Así el selector anda sin JavaScript y con
 * teclado como cualquier enlace.
 */
export function GET(request: Request): NextResponse {
  const parametros = new URL(request.url).searchParams;
  const idioma = parametros.get("a");
  const respuesta = redirigir(volverSeguro(parametros.get("volver")));
  if (esIdioma(idioma)) {
    respuesta.cookies.set(COOKIE_IDIOMA, idioma, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      // `lax` y no `strict`: es una preferencia de lectura, no una credencial,
      // y tiene que valer también cuando alguien llega desde un enlace externo.
      sameSite: "lax",
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
    });
  }
  return respuesta;
}
