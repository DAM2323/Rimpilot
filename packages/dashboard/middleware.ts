import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, vendedorDeSesion } from "./lib/sesion";

/**
 * El libro muestra la plata y las transcripciones de una persona. Antes lo
 * protegía un Basic Auth con una credencial compartida, porque había un solo
 * vendedor por despliegue; ahora cada uno tiene su cuenta y la puerta es la
 * sesión firmada.
 *
 * Acá solo se comprueba la firma, no la contraseña: el middleware corre en el
 * runtime Edge y bcrypt necesita Node. Las contraseñas se verifican en las
 * rutas de /api/cuenta, que corren en Node.
 */

/**
 * El backend de voz corre en otro puerto (y en otro host al desplegarlo), así que
 * `connect-src 'self'` bloquearía el WebSocket del micrófono. Se agrega ese
 * origen y nada más: no se abre `connect-src` a cualquiera.
 */
function origenDelBackend(): string[] {
  const ws = process.env.NEXT_PUBLIC_BACKEND_WS_URL;
  if (!ws) return [];
  try {
    const url = new URL(ws);
    const http = `${url.protocol === "wss:" ? "https:" : "http:"}//${url.host}`;
    return [`${url.protocol}//${url.host}`, http];
  } catch {
    return [];
  }
}

function politicaDeSeguridad(nonce: string, desarrollo: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic'${desarrollo ? " 'unsafe-eval'" : ""}`,
    // El gráfico de flujo fija la altura de cada barra con un atributo `style`,
    // que style-src no puede cubrir con nonce. Es el único inline que queda.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    ["connect-src 'self'", ...origenDelBackend()].join(" "),
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(desarrollo ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function aplicarCabeceras(respuesta: NextResponse, csp: string): NextResponse {
  respuesta.headers.set("Content-Security-Policy", csp);
  respuesta.headers.set("X-Content-Type-Options", "nosniff");
  respuesta.headers.set("X-Frame-Options", "DENY");
  respuesta.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // El micrófono es el canal de entrada del producto, así que se habilita para
  // el propio origen y nada más; el resto de las capacidades siguen negadas.
  respuesta.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()");
  if (process.env.NODE_ENV === "production") {
    respuesta.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return respuesta;
}

/**
 * Lo que exige sesión. El resto del sitio —la landing, entrar, crear cuenta—
 * es público, pero pasa por acá igual: la CSP y las cabeceras de seguridad
 * valen para toda respuesta, no solo para las protegidas.
 */
function exigeSesion(ruta: string): boolean {
  // `/api/voz` entra porque emite el token que abre una sesión de voz, y cada
  // sesión se paga. Además ese token dice de quién es el libro donde se escribe.
  return ruta === "/libro" || ruta.startsWith("/libro/") || ruta.startsWith("/api/voz");
}

function conNonce(request: NextRequest, nonce: string, csp: string, vendedorId?: string): NextResponse {
  // Next lee la CSP de la petición para poner el nonce en sus <script>.
  const cabeceras = new Headers(request.headers);
  cabeceras.set("x-nonce", nonce);
  cabeceras.set("Content-Security-Policy", csp);
  // El dueño del libro viaja en una cabecera que el servidor reescribe en cada
  // petición: lo que mande el cliente con ese nombre se descarta acá.
  if (vendedorId) cabeceras.set("x-vendedor", vendedorId);
  else cabeceras.delete("x-vendedor");
  return NextResponse.next({ request: { headers: cabeceras } });
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = politicaDeSeguridad(nonce, process.env.NODE_ENV !== "production");

  let vendedorId: string | null = null;
  try {
    vendedorId = await vendedorDeSesion(request.cookies.get(COOKIE_SESION)?.value);
  } catch (error) {
    // Falta el secreto de sesión: nadie puede entrar, y hay que decirlo.
    if (exigeSesion(request.nextUrl.pathname)) {
      return aplicarCabeceras(new NextResponse(
        error instanceof Error ? error.message : "Sesión mal configurada.",
        { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
      ), csp);
    }
  }

  if (!exigeSesion(request.nextUrl.pathname)) {
    return aplicarCabeceras(conNonce(request, nonce, csp, vendedorId ?? undefined), csp);
  }

  if (!vendedorId) {
    /**
     * Acá no sirve una ruta relativa como en las rutas de cuenta: Next exige una
     * URL absoluta en el middleware y responde 500. Y `request.url` fuera de
     * Vercel dice `localhost`, así que la base es la dirección pública del sitio.
     */
    const destino = new URL("/entrar", process.env.NEXT_PUBLIC_SITE_URL || request.url);
    destino.searchParams.set("volver", request.nextUrl.pathname);
    return aplicarCabeceras(NextResponse.redirect(destino), csp);
  }

  return aplicarCabeceras(conNonce(request, nonce, csp, vendedorId), csp);
}

export const config = {
  /**
   * Cubre todo salvo estáticos, porque la CSP y las cabeceras van en cada
   * respuesta. Quién necesita sesión lo decide `exigeSesion`, no este matcher:
   * la landing pasa por acá y sale sin pedir nada.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|logo.png|logo-simbolo.png|opengraph-image|robots.txt|sitemap.xml|llms.txt|captura-microfono.js).*)"],
};
