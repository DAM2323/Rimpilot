import { sql } from "../db/client.js";
import { fechaLima, proporcionDeRetiros, recalcularResumen, type ProporcionRetiros, type ResumenDelDia } from "./resumen.js";

export type TipoMovimiento = "venta" | "gasto" | "retiro";
export type MetodoPago = "efectivo" | "yape" | "plin" | "transferencia";

type MovimientoInput = {
  tipo: TipoMovimiento;
  descripcion: string;
  monto: number;
  contraparte?: string;
  metodoPago?: MetodoPago;
  callSid?: string;
  transcripcion?: string;
};

export type Vendedor = { id: string; telefono: string; nombre: string | null; nombre_negocio: string | null };

export async function obtenerOCrearVendedor(telefono: string): Promise<Vendedor> {
  const [vendedor] = await sql()<Vendedor[]>`
    INSERT INTO vendedores (telefono)
    VALUES (${telefono})
    ON CONFLICT (telefono) DO UPDATE SET telefono = EXCLUDED.telefono
    RETURNING id, telefono, nombre, nombre_negocio
  `;
  return vendedor;
}

export async function registrarMovimiento(vendedorId: string, input: MovimientoInput): Promise<{ id: string }> {
  const [movimiento] = await sql()<{ id: string }[]>`
    INSERT INTO movimientos (vendedor_id, tipo, descripcion, monto, contraparte, metodo_pago, call_sid, transcripcion)
    VALUES (
      ${vendedorId}, ${input.tipo}, ${input.descripcion.trim()}, ${input.monto},
      ${input.contraparte?.trim() ?? null}, ${input.metodoPago ?? null},
      ${input.callSid ?? null}, ${input.transcripcion?.trim() ?? null}
    )
    RETURNING id
  `;
  await recalcularResumen(vendedorId, fechaLima());
  return movimiento;
}

export async function consultarResumen(vendedorId: string, fecha?: string): Promise<ResumenDelDia> {
  return recalcularResumen(vendedorId, fecha ?? fechaLima());
}

/**
 * Lo que Wari lee al cerrar: los totales del día más la proporción de la semana.
 * La proporción va aparte de `consultarResumen` porque esa se llama en cada
 * movimiento y al cerrar el socket, y no hace falta pagar la consulta ahí.
 */
export async function resumenParaCierre(
  vendedorId: string,
  fecha?: string,
  idioma: "es" | "en" = "es",
): Promise<ResumenDelDia & { semana: ProporcionRetiros | null }> {
  const dia = fecha ?? fechaLima();
  const [resumen, semana] = await Promise.all([
    recalcularResumen(vendedorId, dia),
    // La frase va en el idioma de la sesión: Wari la lee tal cual.
    proporcionDeRetiros(vendedorId, dia, idioma),
  ]);
  return { ...resumen, semana };
}
