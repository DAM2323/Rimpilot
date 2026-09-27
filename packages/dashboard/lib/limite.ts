/**
 * Freno para registro y entrada (regla 9): sin esto, probar contraseñas contra
 * un correo conocido sale gratis.
 *
 * El almacén es en memoria, con tope de tamaño y limpieza de vencidos. Dos
 * límites que conviene tener presentes: en serverless cada instancia lleva su
 * propio conteo, así que el freno real es más flojo que el número de acá; y al
 * reiniciar el proceso se olvida todo. Para un MVP alcanza; para producción de
 * verdad esto va a un almacén compartido.
 */
const VENTANA_MS = 15 * 60 * 1000;
const MAXIMO_ENTRADAS = 5_000;

const intentos = new Map<string, number[]>();

function limpiar(ahora: number): void {
  intentos.forEach((marcas, clave) => {
    const vigentes = marcas.filter((marca) => ahora - marca < VENTANA_MS);
    if (vigentes.length === 0) intentos.delete(clave);
    else intentos.set(clave, vigentes);
  });

  /**
   * Limpiar lo vencido no alcanza. Si llegan miles de orígenes distintos dentro
   * de la misma ventana, ninguno vence y el mapa crecía sin tope: una prueba
   * con 20 000 orígenes lo dejó en 20 004 entradas. Ahora, si sigue lleno, se
   * olvidan los orígenes vistos primero (un Map recorre en orden de inserción).
   *
   * El costo es real y conviene saberlo: bajo una avalancha así, un origen
   * olvidado vuelve a tener intentos. Es preferible a que el proceso se quede
   * sin memoria, que tumbaría también a todos los que no están atacando.
   */
  let sobrantes = intentos.size - MAXIMO_ENTRADAS;
  intentos.forEach((_marcas, clave) => {
    if (sobrantes <= 0) return;
    intentos.delete(clave);
    sobrantes -= 1;
  });
}

/** `true` si el intento pasa; `false` si ya se agotaron los de la ventana. */
export function permitir(clave: string, maximo: number, ahora = Date.now()): boolean {
  if (intentos.size > MAXIMO_ENTRADAS) limpiar(ahora);

  const marcas = (intentos.get(clave) ?? []).filter((marca) => ahora - marca < VENTANA_MS);
  if (marcas.length >= maximo) {
    intentos.set(clave, marcas);
    return false;
  }
  marcas.push(ahora);
  intentos.set(clave, marcas);
  return true;
}

/** Quien pide, para contar por origen y no globalmente. */
export function quien(request: Request): string {
  const reenviado = request.headers.get("x-forwarded-for");
  return reenviado?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "desconocido";
}

/** Solo para pruebas: cuántos orígenes se están recordando. */
export function origenesRecordados(): number {
  return intentos.size;
}
