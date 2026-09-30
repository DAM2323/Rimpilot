/**
 * El backend de voz vive en un servicio gratis de Render que se duerme tras
 * unos quince minutos sin uso y tarda cerca de un minuto en despertar. El
 * primero que tocaba "Empezar a hablar" se encontraba con "el backend de voz
 * rechazó la sesión": el pedido del token llegaba mientras el servicio todavía
 * estaba arrancando.
 *
 * Dos cosas lo resuelven: despertarlo apenas alguien abre la portada o el
 * libro, que es antes de que toque el micrófono, y reintentar el token un rato
 * en vez de rendirse al primer 502.
 */

/** Lo que devuelve Render mientras el servicio arranca, o un backend saturado. */
const ESTADOS_DE_ESPERA = new Set([502, 503, 504]);
const PLAZO_TOTAL_MS = 60_000;
const PLAZO_POR_INTENTO_MS = 20_000;
const PAUSA_MS = 2_500;
const DESPERTAR_CADA_MS = 60_000;

let ultimoDespertar = 0;

/**
 * Le pega a `/health` sin esperar la respuesta. No hace nada si ya se hizo en
 * el último minuto: la portada se abre muchas veces y el backend no necesita
 * un aviso por cada una.
 */
export function despertarBackend(ahora = Date.now()): void {
  const backendUrl = process.env.RIMPILOT_BACKEND_URL;
  if (!backendUrl || ahora - ultimoDespertar < DESPERTAR_CADA_MS) return;
  ultimoDespertar = ahora;
  void fetch(new URL("/health", backendUrl), { cache: "no-store", signal: AbortSignal.timeout(PLAZO_TOTAL_MS) })
    .catch(() => { /* Si no responde, el pedido del token reintenta igual. */ });
}

/**
 * Hace el pedido y, si el backend está despertando (sin conexión, o un 502,
 * 503 o 504), vuelve a probar hasta un minuto. Cualquier otra respuesta —un
 * 403, un 400— es definitiva y se devuelve tal cual.
 */
export async function pedirConEspera(
  url: URL,
  opciones: RequestInit,
  espera: (ms: number) => Promise<void> = (ms) => new Promise((listo) => setTimeout(listo, ms)),
  ahora: () => number = Date.now,
): Promise<Response> {
  const limite = ahora() + PLAZO_TOTAL_MS;
  for (;;) {
    let respuesta: Response | null = null;
    let fallo: unknown = null;
    try {
      respuesta = await fetch(url, { ...opciones, signal: AbortSignal.timeout(PLAZO_POR_INTENTO_MS) });
    } catch (error) {
      fallo = error;
    }
    if (respuesta && !ESTADOS_DE_ESPERA.has(respuesta.status)) return respuesta;
    if (ahora() + PAUSA_MS >= limite) {
      if (respuesta) return respuesta;
      throw fallo;
    }
    await espera(PAUSA_MS);
  }
}
