/**
 * La sesión del panel: quién es el dueño del libro que se está mirando.
 *
 * Es un token firmado con HMAC-SHA256 —`vendedorId.expira.firma`— y no un id
 * suelto en una cookie, porque la cookie la controla el cliente: sin firma,
 * cambiar un UUID sería entrar al libro de otro.
 *
 * Todo con Web Crypto y no con `node:crypto` a propósito: el middleware corre
 * en el runtime Edge, donde `node:crypto` no existe, y este mismo módulo tiene
 * que servir ahí y en los route handlers.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const COOKIE_SESION = "rimpilot_sesion";
/** Un vendedor no debería tener que volver a entrar cada semana. */
export const DIAS_DE_SESION = 30;

const LARGO_MINIMO_SECRETO = 32;

function secreto(): string {
  const valor = process.env.RIMPILOT_SESSION_SECRET;
  if (!valor || valor.length < LARGO_MINIMO_SECRETO) {
    throw new Error(
      `RIMPILOT_SESSION_SECRET es obligatoria y debe tener al menos ${LARGO_MINIMO_SECRETO} caracteres.`,
    );
  }
  return valor;
}

async function clave(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secreto()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function aBase64Url(bytes: ArrayBuffer): string {
  const crudos = new Uint8Array(bytes);
  let binario = "";
  for (let i = 0; i < crudos.length; i += 1) binario += String.fromCharCode(crudos[i]);
  return btoa(binario).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function firmar(payload: string): Promise<string> {
  const firma = await crypto.subtle.sign("HMAC", await clave(), new TextEncoder().encode(payload));
  return aBase64Url(firma);
}

/** Regla 6: comparación en tiempo constante, nunca con `===`. */
function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i += 1) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

export async function crearSesion(vendedorId: string, ahora = Date.now()): Promise<string> {
  const expira = Math.floor(ahora / 1000) + DIAS_DE_SESION * 24 * 60 * 60;
  const payload = `${vendedorId}.${expira}`;
  return `${payload}.${await firmar(payload)}`;
}

/** Devuelve el vendedor solo si la firma es válida y la sesión no venció. */
export async function vendedorDeSesion(token: string | undefined, ahora = Date.now()): Promise<string | null> {
  if (!token) return null;
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [vendedorId, expira, firma] = partes;

  if (!UUID.test(vendedorId)) return null;
  if (!iguales(firma, await firmar(`${vendedorId}.${expira}`))) return null;

  const vence = Number(expira);
  if (!Number.isFinite(vence) || vence * 1000 <= ahora) return null;
  return vendedorId;
}

/**
 * `sameSite: strict` según la regla 10. Tiene un costo que conviene conocer: si
 * alguien llega al panel desde un enlace externo, el navegador no manda la
 * cookie en esa primera navegación y ve la pantalla de entrada; al recargar ya
 * entra. Es el precio de que ningún sitio ajeno pueda usar su sesión.
 */
export function opcionesCookie() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: DIAS_DE_SESION * 24 * 60 * 60,
  };
}
