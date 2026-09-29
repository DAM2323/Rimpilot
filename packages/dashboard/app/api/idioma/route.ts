import { NextResponse } from "next/server";
import { COOKIE_IDIOMA, esIdioma, volverSeguro } from "../../../lib/idioma";

/**
 * Cambia el idioma y vuelve a la página donde estaba la persona.
 *
 * Es un enlace (GET) y no un formulario porque no toca datos de nadie: solo
 * guarda una preferencia de lectura. Así el selector anda sin JavaScript y con
 * teclado como cualquier enlace.
 */
export function GET(request: Request): NextResponse {
  const url = new URL(request.url);
  const idioma = url.searchParams.get("a");
  const destino = new URL(volverSeguro(url.searchParams.get("volver")), url.origin);
  const respuesta = NextResponse.redirect(destino, { status: 303 });
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
