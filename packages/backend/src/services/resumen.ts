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
