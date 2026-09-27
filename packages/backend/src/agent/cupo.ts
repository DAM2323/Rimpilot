/**
 * Regla 17: la clave de AssemblyAI es una sola y cada sesión se paga por uso.
 *
 * Hay tres topes y cada uno cierra una puerta distinta:
 *
 * - Simultáneas: cuántas sesiones abiertas a la vez. Es global, no por
 *   transporte: si el teléfono y el navegador llevaran contadores separados,
 *   dos canales de cinco sesiones darían diez.
 * - Diarias por vendedor: sin esto, una sola cuenta puede abrir sesiones una
 *   detrás de otra todo el día sin chocar nunca con el tope de simultáneas.
 * - Diarias en total: el modo invitado crea una cuenta por visita, así que la
 *   cuota por vendedor sola no alcanza. Quien abre cien invitados tiene cien
 *   cuotas; este tope es el que acota el gasto de verdad.
 *
 * Los contadores viven en memoria. En el backend eso sí funciona, a diferencia
 * del panel: corre en un solo proceso de larga vida (Render), no en funciones
 * serverless que se multiplican. Si algún día corre en varias instancias, cada
 * una llevaría su propia cuenta y el tope real sería la suma.
 *
 * El mapa por vendedor no necesita limpieza aparte: se vacía al cambiar el día,
 * y como cada entrada exige al menos una sesión, nunca puede tener más entradas
 * que el tope diario total.
 */
function entero(nombre: string, porDefecto: number): number {
  const valor = Number(process.env[nombre]);
  return Number.isInteger(valor) && valor > 0 ? valor : porDefecto;
}

const MAX_SIMULTANEAS = entero("MAX_LLAMADAS_CONCURRENTES", 5);
const MAX_DIARIAS_POR_VENDEDOR = entero("MAX_SESIONES_POR_VENDEDOR_DIA", 20);
const MAX_DIARIAS_TOTALES = entero("MAX_SESIONES_DIA", 200);

export type Rechazo = "simultaneas" | "diaria_vendedor" | "diaria_total";
export type Cupo = { liberar: () => void } | { rechazo: Rechazo };

let activas = 0;
let dia = "";
let totalDelDia = 0;
const porVendedor = new Map<string, number>();

/** El día contable es el de Lima (UTC-5, sin horario de verano), no el del servidor. */
function diaEnLima(ahora: number): string {
  return new Date(ahora - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function sesionesActivas(): number {
  return activas;
}

/**
 * Reserva un cupo. Devuelve la función que lo libera, o el motivo del rechazo.
 *
 * La sesión cuenta para los topes diarios desde que se abre, aunque falle al
 * segundo: el costo de AssemblyAI empieza con la conexión, no con la charla.
 *
 * Liberar dos veces no resta dos cupos: el cierre de un WebSocket llega por
 * `close` y por `error`, y los dos caminos llaman a lo mismo.
 */
export function tomarCupo(vendedorId: string, ahora = Date.now()): Cupo {
  const hoy = diaEnLima(ahora);
  if (hoy !== dia) {
    dia = hoy;
    totalDelDia = 0;
    porVendedor.clear();
  }

  if (activas >= MAX_SIMULTANEAS) return { rechazo: "simultaneas" };
  if (totalDelDia >= MAX_DIARIAS_TOTALES) return { rechazo: "diaria_total" };
  const delVendedor = porVendedor.get(vendedorId) ?? 0;
  if (delVendedor >= MAX_DIARIAS_POR_VENDEDOR) return { rechazo: "diaria_vendedor" };

  activas += 1;
  totalDelDia += 1;
  porVendedor.set(vendedorId, delVendedor + 1);

  let liberado = false;
  return {
    liberar: () => {
      if (liberado) return;
      liberado = true;
      activas -= 1;
    },
  };
}

/** Solo para pruebas: vuelve los contadores a cero. */
export function reiniciarCupos(): void {
  activas = 0;
  dia = "";
  totalDelDia = 0;
  porVendedor.clear();
}
