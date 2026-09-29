import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Idioma } from "./idioma";
import { textos } from "./textos";
import type { Movimiento, PuntoFlujo, Resumen, TipoMovimiento } from "./types";

/**
 * Todas las consultas reciben el `vendedorId` de la sesión. Antes salía de una
 * variable de entorno, porque había un solo vendedor por despliegue; con
 * cuentas, un valor fijo acá significaría que cualquiera ve el libro de otro.
 *
 * Por eso no hay un valor por defecto ni una constante de módulo: si la llamada
 * no trae dueño, no hay consulta.
 */
export type VendedorDashboard = { nombre: string | null; nombre_negocio: string | null; es_invitado: boolean };

function cliente(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

export function dashboardConfigurado(): boolean { return cliente() !== null; }

export function fechaLima(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/**
 * El saludo según la hora de Lima, no la del servidor: en Vercel el servidor
 * corre en UTC y a las cinco de la tarde en Lima ya son las diez de la noche.
 * Antes decía "Buenos días" siempre.
 */
export function saludoLima(date = new Date(), idioma: Idioma = "es"): string {
  const hora = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Lima", hour: "numeric", hourCycle: "h23" }).format(date));
  const { saludo } = textos(idioma).libro;
  if (hora >= 5 && hora < 12) return saludo.manana;
  if (hora >= 12 && hora < 19) return saludo.tarde;
  return saludo.noche;
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

export async function obtenerMovimientos(vendedorId: string, filters: { tipo?: TipoMovimiento; desde?: string; hasta?: string } = {}): Promise<Movimiento[]> {
  const db = cliente();
  if (!db) return [];
  let query = db.from("movimientos").select("id,tipo,descripcion,monto,contraparte,metodo_pago,transcripcion,creado_en").eq("vendedor_id", vendedorId).order("creado_en", { ascending: false }).limit(100);
  if (filters.tipo) query = query.eq("tipo", filters.tipo);
  if (filters.desde) query = query.gte("creado_en", rangoLima(filters.desde).start);
  if (filters.hasta) query = query.lt("creado_en", rangoLima(filters.hasta).end);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapMovimiento(row));
}

const RESUMEN_VACIO: Resumen = { totalVentas: 0, totalGastos: 0, totalRetiros: 0, saldoDelDia: 0 };

export async function obtenerResumen(vendedorId: string): Promise<Resumen> {
  const db = cliente();
  if (!db) return RESUMEN_VACIO;
  const { data, error } = await db.from("resumen_diario").select("total_ventas,total_gastos,total_retiros,saldo_del_dia").eq("vendedor_id", vendedorId).eq("fecha", fechaLima()).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return RESUMEN_VACIO;
  return {
    totalVentas: number(data.total_ventas), totalGastos: number(data.total_gastos),
    totalRetiros: number(data.total_retiros), saldoDelDia: number(data.saldo_del_dia),
  };
}

export async function obtenerFlujo(vendedorId: string, days = 7): Promise<PuntoFlujo[]> {
  const db = cliente();
  const dates = Array.from({ length: days }, (_, index) => {
    const reference = new Date(); reference.setDate(reference.getDate() - (days - 1 - index)); return fechaLima(reference);
  });
  if (!db) return dates.map((fecha) => ({ fecha, ventas: 0, gastos: 0, retiros: 0 }));
  const firstRange = rangoLima(dates[0]);
  const lastRange = rangoLima(dates[dates.length - 1]);
  const { data, error } = await db.from("movimientos").select("tipo,monto,creado_en").eq("vendedor_id", vendedorId).gte("creado_en", firstRange.start).lt("creado_en", lastRange.end);
  if (error) throw new Error(error.message);
  return dates.map((fecha) => (data ?? []).filter((row) => fechaLima(new Date(row.creado_en)) === fecha).reduce<PuntoFlujo>((point, row) => ({
    ...point,
    ventas: point.ventas + (row.tipo === "venta" ? number(row.monto) : 0),
    gastos: point.gastos + (row.tipo === "gasto" ? number(row.monto) : 0),
    retiros: point.retiros + (row.tipo === "retiro" ? number(row.monto) : 0),
  }), { fecha, ventas: 0, gastos: 0, retiros: 0 }));
}

/**
 * Filtra por id **y** por dueño. Con solo el id, cambiar el UUID de la URL
 * mostraría el movimiento de otra persona: es el IDOR clásico, y acá el dato
 * expuesto sería cuánto vendió alguien y lo que dijo al registrarlo.
 */
export async function obtenerMovimiento(vendedorId: string, id: string): Promise<Movimiento | null> {
  const db = cliente();
  if (!db) return null;
  const { data, error } = await db.from("movimientos").select("id,tipo,descripcion,monto,contraparte,metodo_pago,transcripcion,creado_en").eq("vendedor_id", vendedorId).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapMovimiento(data) : null;
}

export async function obtenerVendedor(vendedorId: string): Promise<VendedorDashboard | null> {
  const db = cliente();
  if (!db) return null;
  const { data, error } = await db.from("vendedores").select("nombre,nombre_negocio,es_invitado").eq("id", vendedorId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as VendedorDashboard | null;
}
