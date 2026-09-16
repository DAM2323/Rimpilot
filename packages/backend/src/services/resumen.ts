import { sql } from "../db/client.js";

export type ResumenDelDia = {
  fecha: string;
  totalVentas: number;
  totalGastos: number;
  /** Plata que el vendedor sacó de la caja para él, no para el negocio. */
  totalRetiros: number;
  /** La caja: ventas − gastos − retiros. */
  saldoDelDia: number;
};

/**
 * Cuánto de lo que vendió se llevó el vendedor, en los últimos días.
 *
 * `frase` viene armada desde acá a propósito: el modelo la lee tal cual y no
 * calcula nada (regla 19). Es un hecho sobre su propia plata, no un consejo: no
 * dice si está bien ni si debería sacar menos.
 */
export type ProporcionRetiros = {
  dias: number;
  ventas: number;
  retiros: number;
  porcentaje: number;
  frase: string;
};

/**
 * Siete días y no uno: con un solo día el número no significa nada —vender 20 y
 * sacar 20 da 100%— y una semana ya tiene forma.
 */
export const DIAS_DE_VENTANA = 7;

/**
 * Devuelve `null` cuando no hay proporción que mostrar: sin ventas no hay
 * denominador, y sin retiros no hay nada que contar. Un 0% el primer día no le
 * dice nada a nadie.
 */
export function fraseProporcion(ventas: number, retiros: number): string | null {
  if (ventas <= 0 || retiros <= 0) return null;
  const porcentaje = Math.round((retiros / ventas) * 100);
  if (porcentaje > 50) return "más de la mitad de lo que vendiste";
  // Redondeado: "1 de cada 3" se entiende hablado, "el 30,7 %" no.
  return `1 de cada ${Math.round(ventas / retiros)} soles que vendiste`;
}

export function fechaLima(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function proporcionDeRetiros(vendedorId: string, hasta = fechaLima()): Promise<ProporcionRetiros | null> {
  const [totales] = await sql()<{ ventas: string; retiros: string }[]>`
    SELECT
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'venta'), 0)::text AS ventas,
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'retiro'), 0)::text AS retiros
    FROM movimientos
    WHERE vendedor_id = ${vendedorId}
      AND creado_en >= ((${hasta}::date - ${DIAS_DE_VENTANA - 1}::integer) AT TIME ZONE 'America/Lima')
      AND creado_en < ((${hasta}::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')
  `;

  const ventas = Number(totales.ventas);
  const retiros = Number(totales.retiros);
  const frase = fraseProporcion(ventas, retiros);
  if (!frase) return null;
  return { dias: DIAS_DE_VENTANA, ventas, retiros, porcentaje: Math.round((retiros / ventas) * 100), frase };
}

export async function recalcularResumen(vendedorId: string, fecha = fechaLima()): Promise<ResumenDelDia> {
  const [totals] = await sql()<{
    total_ventas: string;
    total_gastos: string;
    total_retiros: string;
  }[]>`
    SELECT
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'venta'), 0)::text AS total_ventas,
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'gasto'), 0)::text AS total_gastos,
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'retiro'), 0)::text AS total_retiros
    FROM movimientos
    WHERE vendedor_id = ${vendedorId}
      AND creado_en >= (${fecha}::date AT TIME ZONE 'America/Lima')
      AND creado_en < ((${fecha}::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')
  `;

  const totalVentas = Number(totals.total_ventas);
  const totalGastos = Number(totals.total_gastos);
  const totalRetiros = Number(totals.total_retiros);
  const summary: ResumenDelDia = {
    fecha,
    totalVentas,
    totalGastos,
    totalRetiros,
    // El retiro sale de la caja igual que el gasto: si no se resta, la caja que
    // muestra el panel no es la plata que el vendedor tiene en el bolsillo.
    saldoDelDia: totalVentas - totalGastos - totalRetiros,
  };

  await sql()`
    INSERT INTO resumen_diario (vendedor_id, fecha, total_ventas, total_gastos, total_retiros, saldo_del_dia)
    VALUES (${vendedorId}, ${fecha}, ${summary.totalVentas}, ${summary.totalGastos}, ${summary.totalRetiros}, ${summary.saldoDelDia})
    ON CONFLICT (vendedor_id, fecha) DO UPDATE SET
      total_ventas = EXCLUDED.total_ventas,
      total_gastos = EXCLUDED.total_gastos,
      total_retiros = EXCLUDED.total_retiros,
      saldo_del_dia = EXCLUDED.saldo_del_dia
  `;
  return summary;
}
