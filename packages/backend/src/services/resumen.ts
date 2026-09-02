import { sql } from "../db/client.js";

export type ResumenDelDia = {
  fecha: string;
  totalVentas: number;
  totalGastos: number;
  saldoDelDia: number;
  totalPorCobrar: number;
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
  const [totals] = await sql<{
    total_ventas: string;
    total_gastos: string;
    total_por_cobrar: string;
  }[]>`
    SELECT
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'venta'), 0)::text AS total_ventas,
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'gasto'), 0)::text AS total_gastos,
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'cuenta_por_cobrar'), 0)::text AS total_por_cobrar
    FROM movimientos
    WHERE vendedor_id = ${vendedorId}
      AND creado_en >= (${fecha}::date AT TIME ZONE 'America/Lima')
      AND creado_en < ((${fecha}::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')
  `;

  const totalVentas = Number(totals.total_ventas);
  const totalGastos = Number(totals.total_gastos);
  const summary: ResumenDelDia = {
    fecha,
    totalVentas,
    totalGastos,
    saldoDelDia: totalVentas - totalGastos,
    totalPorCobrar: Number(totals.total_por_cobrar),
  };

  await sql`
    INSERT INTO resumen_diario (vendedor_id, fecha, total_ventas, total_gastos, saldo_del_dia)
    VALUES (${vendedorId}, ${fecha}, ${summary.totalVentas}, ${summary.totalGastos}, ${summary.saldoDelDia})
    ON CONFLICT (vendedor_id, fecha) DO UPDATE SET
      total_ventas = EXCLUDED.total_ventas,
      total_gastos = EXCLUDED.total_gastos,
      saldo_del_dia = EXCLUDED.saldo_del_dia
  `;
  return summary;
}
