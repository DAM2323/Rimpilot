import { NextResponse } from "next/server";

/**
 * Una redirección con `Location` relativa: `/entrar`, no
 * `https://host/entrar`. El navegador la resuelve contra la dirección que
 * tiene en la barra, que es siempre la correcta.
 *
 * Armarla con `request.url` parecía lo mismo y no lo es: fuera de Vercel,
 * `next start` detrás de un proxy (Render) arma `request.url` con
 * `localhost:PUERTO`, y cada redirección —entrar, crear cuenta, probar, salir,
 * cambiar de idioma— mandaba a la persona a `https://localhost:10000/...`.
 * En la computadora no se nota porque ahí `localhost` es justo donde está.
 *
 * Sirve para las rutas de API. El middleware no la puede usar —ahí Next exige
 * una URL absoluta— y arma la suya con `NEXT_PUBLIC_SITE_URL`.
 */
export function redirigir(ruta: string, status: 303 | 307 = 303): NextResponse {
  return new NextResponse(null, { status, headers: { Location: ruta } });
}
