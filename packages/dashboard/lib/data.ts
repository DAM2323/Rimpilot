import { createClient } from "@supabase/supabase-js";
import type { Movimiento, PuntoFlujo, Resumen, TipoMovimiento } from "./types";

const demoMovimientos: Movimiento[] = [
  { id: "demo-venta", tipo: "venta", descripcion: "3 pollos", monto: 75, contraparte: null, metodo_pago: "yape", transcripcion: "Vendí 3 pollos a 25 soles cada uno, me pagaron por Yape.", creado_en: new Date().toISOString() },
  { id: "demo-gasto", tipo: "gasto", descripcion: "Pasaje", monto: 15, contraparte: null, metodo_pago: "efectivo", transcripcion: "Gasté 15 en pasaje.", creado_en: new Date(Date.now() - 1_800_000).toISOString() },
  { id: "demo-cobrar", tipo: "cuenta_por_cobrar", descripcion: "Venta al fiado", monto: 20, contraparte: "Doña Rosa", metodo_pago: "fiado", transcripcion: "A Doña Rosa le fié 20 soles.", creado_en: new Date(Date.now() - 3_600_000).toISOString() },
];

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

function todayRange(): { start: string; end: string } {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function number(value: unknown): number { return typeof value === "number" ? value : Number(value ?? 0); }

export async function obtenerMovimientos(filters: { tipo?: TipoMovimiento; desde?: string; hasta?: string } = {}): Promise<Movimiento[]> {
  const client = supabase();
  if (!client) return filters.tipo ? demoMovimientos.filter((item) => item.tipo === filters.tipo) : demoMovimientos;
  let query = client.from("movimientos").select("id,tipo,descripcion,monto,contraparte,metodo_pago,transcripcion,creado_en").order("creado_en", { ascending: false }).limit(100);
  if (filters.tipo) query = query.eq("tipo", filters.tipo);
  if (filters.desde) query = query.gte("creado_en", `${filters.desde}T00:00:00`);
  if (filters.hasta) query = query.lte("creado_en", `${filters.hasta}T23:59:59`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ ...row, monto: number(row.monto) })) as Movimiento[];
}

export async function obtenerResumen(): Promise<Resumen> {
  const client = supabase();
  if (!client) return { totalVentas: 75, totalGastos: 15, saldoDelDia: 60, totalPorCobrar: 20 };
  const { start, end } = todayRange();
  const { data, error } = await client.from("movimientos").select("tipo,monto").gte("creado_en", start).lt("creado_en", end);
  if (error) throw new Error(error.message);
  return (data ?? []).reduce<Resumen>((summary, row) => {
    const monto = number(row.monto);
    if (row.tipo === "venta") summary.totalVentas += monto;
    if (row.tipo === "gasto") summary.totalGastos += monto;
    if (row.tipo === "cuenta_por_cobrar") summary.totalPorCobrar += monto;
    summary.saldoDelDia = summary.totalVentas - summary.totalGastos;
    return summary;
  }, { totalVentas: 0, totalGastos: 0, saldoDelDia: 0, totalPorCobrar: 0 });
}

export async function obtenerFlujo(days = 7): Promise<PuntoFlujo[]> {
  const rows = await obtenerMovimientos();
  const dates = Array.from({ length: days }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - (days - 1 - index)); return date.toISOString().slice(0, 10);
  });
  return dates.map((fecha) => rows.filter((row) => row.creado_en.slice(0, 10) === fecha).reduce<PuntoFlujo>((point, row) => ({
    ...point, ventas: point.ventas + (row.tipo === "venta" ? row.monto : 0), gastos: point.gastos + (row.tipo === "gasto" ? row.monto : 0),
  }), { fecha, ventas: 0, gastos: 0 }));
}

export async function obtenerMovimiento(id: string): Promise<Movimiento | null> {
  if (id.startsWith("demo-")) return demoMovimientos.find((row) => row.id === id) ?? null;
  const client = supabase();
  if (!client) return null;
  const { data, error } = await client.from("movimientos").select("id,tipo,descripcion,monto,contraparte,metodo_pago,transcripcion,creado_en").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { ...data, monto: number(data.monto) } as Movimiento : null;
}
