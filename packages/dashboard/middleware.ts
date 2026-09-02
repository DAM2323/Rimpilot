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

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const usuarioEsperado = process.env.RIMPILOT_DASHBOARD_USER;
  const claveEsperada = process.env.RIMPILOT_DASHBOARD_PASSWORD;
  if (!usuarioEsperado || !claveEsperada || claveEsperada.length < LARGO_MINIMO_CLAVE) {
    return new NextResponse(
      `Panel bloqueado: falta RIMPILOT_DASHBOARD_USER o RIMPILOT_DASHBOARD_PASSWORD (mínimo ${LARGO_MINIMO_CLAVE} caracteres) en packages/dashboard/.env.local.`,
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const credenciales = decodificarBasic(header);
    if (credenciales) {
      const [usuario, clave, esperadoUsuario, esperadaClave] = await Promise.all([
        sha256(credenciales.usuario), sha256(credenciales.clave),
        sha256(usuarioEsperado), sha256(claveEsperada),
      ]);
      if (iguales(usuario, esperadoUsuario) && iguales(clave, esperadaClave)) return NextResponse.next();
    }
  }

  return new NextResponse("Autenticación requerida.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="RIMPILOT", charset="UTF-8"',
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
