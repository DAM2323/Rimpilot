import { NextResponse, type NextRequest } from "next/server";

/**
 * El panel muestra el libro contable y las transcripciones de una persona real.
 * No hay sistema de usuarios todavía, así que la puerta mínima es Basic Auth:
 * sin credenciales configuradas el panel no sirve nada (falla cerrado).
 */
const LARGO_MINIMO_CLAVE = 16;

async function sha256(valor: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(valor));
  return new Uint8Array(digest);
}

/** Comparación en tiempo constante sobre digests de largo fijo. */
function iguales(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i += 1) diferencia |= a[i] ^ b[i];
  return diferencia === 0;
}

function decodificarBasic(header: string): { usuario: string; clave: string } | null {
  try {
    const bytes = Uint8Array.from(atob(header.slice(6)), (caracter) => caracter.charCodeAt(0));
    const texto = new TextDecoder().decode(bytes);
    const separador = texto.indexOf(":");
    if (separador < 0) return null;
    return { usuario: texto.slice(0, separador), clave: texto.slice(separador + 1) };
  } catch {
    return null;
  }
}

/**
 * CSP estricta: los scripts solo corren con el nonce de esta respuesta y lo que
 * ellos carguen hereda permiso por `strict-dynamic`. Sin `unsafe-inline` en
 * script-src y sin `unsafe-eval` fuera de desarrollo, donde el hot reload de
 * Next lo exige.
 */
function politicaDeSeguridad(nonce: string, desarrollo: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic'${desarrollo ? " 'unsafe-eval'" : ""}`,
    // El gráfico de flujo fija la altura de cada barra con un atributo `style`,
    // que style-src no puede cubrir con nonce. Es el único inline que queda.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
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
  respuesta.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()");
  if (process.env.NODE_ENV === "production") {
    respuesta.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return respuesta;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = politicaDeSeguridad(nonce, process.env.NODE_ENV !== "production");

  const usuarioEsperado = process.env.RIMPILOT_DASHBOARD_USER;
  const claveEsperada = process.env.RIMPILOT_DASHBOARD_PASSWORD;
  if (!usuarioEsperado || !claveEsperada || claveEsperada.length < LARGO_MINIMO_CLAVE) {
    return aplicarCabeceras(new NextResponse(
      `Panel bloqueado: falta RIMPILOT_DASHBOARD_USER o RIMPILOT_DASHBOARD_PASSWORD (mínimo ${LARGO_MINIMO_CLAVE} caracteres) en packages/dashboard/.env.local.`,
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    ), csp);
  }

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const credenciales = decodificarBasic(header);
    if (credenciales) {
      const [usuario, clave, esperadoUsuario, esperadaClave] = await Promise.all([
        sha256(credenciales.usuario), sha256(credenciales.clave),
        sha256(usuarioEsperado), sha256(claveEsperada),
      ]);
      if (iguales(usuario, esperadoUsuario) && iguales(clave, esperadaClave)) {
        // Next lee la CSP de la petición para poner el nonce en sus <script>.
        const cabeceras = new Headers(request.headers);
        cabeceras.set("x-nonce", nonce);
        cabeceras.set("Content-Security-Policy", csp);
        return aplicarCabeceras(NextResponse.next({ request: { headers: cabeceras } }), csp);
      }
    }
  }

  return aplicarCabeceras(new NextResponse("Autenticación requerida.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="RIMPILOT", charset="UTF-8"',
      "content-type": "text/plain; charset=utf-8",
    },
  }), csp);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|opengraph-image|robots.txt|sitemap.xml|llms.txt).*)"],
};
