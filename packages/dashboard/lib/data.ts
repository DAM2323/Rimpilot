import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Movimiento, PuntoFlujo, Resumen, TipoMovimiento } from "./types";

type DashboardConfig = { client: SupabaseClient; vendedorId: string };
export type VendedorDashboard = { nombre: string | null; nombre_negocio: string | null };

function config(): DashboardConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vendedorId = process.env.RIMPILOT_VENDOR_ID;
  if (!url || !serviceRole || !vendedorId) return null;
  return { client: createClient(url, serviceRole, { auth: { persistSession: false } }), vendedorId };
}

export function dashboardConfigurado(): boolean { return config() !== null; }

export function fechaLima(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function siguienteFecha(fecha: string): string {
  const date = new Date(`${fecha}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function rangoLima(fecha: string): { start: string; end: string } {
  return { start: `${fecha}T00:00:00-05:00`, end: `${siguienteFecha(fecha)}T00:00:00-05:00` };
}

function number(value: unknown): number { return typeof value === "number" ? value : Number(value ?? 0); }
function mapMovimiento(row: Record<string, unknown>): Movimiento {
  return { ...row, monto: number(row.monto) } as Movimiento;
}

export async function obtenerMovimientos(filters: { tipo?: TipoMovimiento; desde?: string; hasta?: string } = {}): Promise<Movimiento[]> {
  const dashboard = config();
  if (!dashboard) return [];
  let query = dashboard.client.from("movimientos").select("id,tipo,descripcion,monto,contraparte,metodo_pago,transcripcion,creado_en").eq("vendedor_id", dashboard.vendedorId).order("creado_en", { ascending: false }).limit(100);
  if (filters.tipo) query = query.eq("tipo", filters.tipo);
  if (filters.desde) query = query.gte("creado_en", rangoLima(filters.desde).start);
  if (filters.hasta) query = query.lt("creado_en", rangoLima(filters.hasta).end);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapMovimiento(row));
}

const RESUMEN_VACIO: Resumen = { totalVentas: 0, totalGastos: 0, totalRetiros: 0, saldoDelDia: 0 };

export async function obtenerResumen(): Promise<Resumen> {
  const dashboard = config();
  if (!dashboard) return RESUMEN_VACIO;
  const { data, error } = await dashboard.client.from("resumen_diario").select("total_ventas,total_gastos,total_retiros,saldo_del_dia").eq("vendedor_id", dashboard.vendedorId).eq("fecha", fechaLima()).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return RESUMEN_VACIO;
  return {
    totalVentas: number(data.total_ventas), totalGastos: number(data.total_gastos),
    totalRetiros: number(data.total_retiros), saldoDelDia: number(data.saldo_del_dia),
  };
}

export async function obtenerFlujo(days = 7): Promise<PuntoFlujo[]> {
  const dashboard = config();
  const dates = Array.from({ length: days }, (_, index) => {
    const reference = new Date(); reference.setDate(reference.getDate() - (days - 1 - index)); return fechaLima(reference);
  });
  if (!dashboard) return dates.map((fecha) => ({ fecha, ventas: 0, gastos: 0, retiros: 0 }));
  const firstRange = rangoLima(dates[0]);
  const lastRange = rangoLima(dates[dates.length - 1]);
  const { data, error } = await dashboard.client.from("movimientos").select("tipo,monto,creado_en").eq("vendedor_id", dashboard.vendedorId).gte("creado_en", firstRange.start).lt("creado_en", lastRange.end);
  if (error) throw new Error(error.message);
  return dates.map((fecha) => (data ?? []).filter((row) => fechaLima(new Date(row.creado_en)) === fecha).reduce<PuntoFlujo>((point, row) => ({
    ...point,
    ventas: point.ventas + (row.tipo === "venta" ? number(row.monto) : 0),
    gastos: point.gastos + (row.tipo === "gasto" ? number(row.monto) : 0),
    retiros: point.retiros + (row.tipo === "retiro" ? number(row.monto) : 0),
  }), { fecha, ventas: 0, gastos: 0, retiros: 0 }));
}

export async function obtenerMovimiento(id: string): Promise<Movimiento | null> {
  const dashboard = config();
  if (!dashboard) return null;
  const { data, error } = await dashboard.client.from("movimientos").select("id,tipo,descripcion,monto,contraparte,metodo_pago,transcripcion,creado_en").eq("vendedor_id", dashboard.vendedorId).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapMovimiento(data) : null;
}

export async function obtenerVendedor(): Promise<VendedorDashboard | null> {
  const dashboard = config();
  if (!dashboard) return null;
  const { data, error } = await dashboard.client.from("vendedores").select("nombre,nombre_negocio").eq("id", dashboard.vendedorId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
