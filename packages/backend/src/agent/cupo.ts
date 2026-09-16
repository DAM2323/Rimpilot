/**
 * Regla 17: la clave de AssemblyAI es una sola y cada sesión se paga por uso.
 * El tope tiene que ser global, no por transporte: si el teléfono y el navegador
 * llevaran contadores separados, dos canales de cinco sesiones darían diez.
 */
const MAX_SESIONES = Math.max(1, Number(process.env.MAX_LLAMADAS_CONCURRENTES) || 5);

let activas = 0;

export function sesionesActivas(): number {
  return activas;
}

export function topeSesiones(): number {
  return MAX_SESIONES;
}

/**
 * Reserva un cupo. Devuelve la función que lo libera, o `null` si no hay lugar.
 * Liberar dos veces no resta dos cupos: el cierre de un WebSocket llega por
 * `close` y por `error`, y los dos caminos llaman a lo mismo.
 */
export function tomarCupo(): (() => void) | null {
  if (activas >= MAX_SESIONES) return null;
  activas += 1;
  let liberado = false;
  return () => {
    if (liberado) return;
    liberado = true;
    activas -= 1;
  };
}
