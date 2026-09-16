import type { PuntoFlujo } from "./types";

/**
 * Cuánto de lo que vendió se llevó el vendedor, en la misma ventana de siete
 * días que ya muestra el gráfico. Se calcula sobre los puntos que la página ya
 * pidió: no cuesta una consulta más.
 *
 * Es un hecho sobre su propia plata, no un consejo: dice cuánto sacó en
 * proporción a cuánto vendió y no opina si está bien.
 *
 * La misma lógica vive en `packages/backend/src/services/resumen.ts`, que es la
 * que lee Wari en voz alta. Las dos tienen que dar la misma frase: si tocás una,
 * tocá la otra. Están separadas porque el panel lee por PostgREST y el backend
 * por PostgreSQL directo, igual que pasa con `fechaLima`.
 */
export function fraseProporcion(ventas: number, retiros: number): string | null {
  if (ventas <= 0 || retiros <= 0) return null;
  const porcentaje = Math.round((retiros / ventas) * 100);
  if (porcentaje > 50) return "más de la mitad de lo que vendiste";
  // Redondeado: "1 de cada 3" se lee de un vistazo, "el 30,7 %" no.
  return `1 de cada ${Math.round(ventas / retiros)} soles que vendiste`;
}

export function proporcionDeLaSemana(puntos: PuntoFlujo[]): string | null {
  const ventas = puntos.reduce((total, punto) => total + punto.ventas, 0);
  const retiros = puntos.reduce((total, punto) => total + punto.retiros, 0);
  const frase = fraseProporcion(ventas, retiros);
  return frase ? `${frase}, esta semana` : null;
}
