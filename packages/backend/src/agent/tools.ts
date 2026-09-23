import { z } from "zod";

/**
 * Las herramientas que Wari puede pedir, en el formato del ejemplo oficial de
 * AssemblyAI: `type: "function"`, nombre, descripción y `parameters` con
 * `required`.
 *
 * Ninguna pide `transcripcion`. Antes sí, y era trabajo de más para el modelo
 * en cada llamada: el puente ya guarda la última transcripción final del
 * vendedor y la escribe él. La frase que originó el movimiento se sigue
 * guardando igual; lo que cambia es quién la pone.
 */
export const herramientas = [
  {
    type: "function",
    name: "registrar_venta",
    description: "Registra una venta. Llamar una vez por cada venta mencionada.",
    parameters: {
      type: "object",
      properties: {
        descripcion: { type: "string", description: "Qué vendió, en pocas palabras" },
        monto: { type: "number" },
        metodo_pago: { type: "string", enum: ["efectivo", "yape", "plin", "transferencia"] },
        contraparte: { type: "string", description: "A quién vendió, si lo mencionó" },
      },
      required: ["descripcion", "monto"],
    },
  },
  {
    type: "function",
    name: "registrar_gasto",
    description: "Registra un gasto del negocio o relacionado con el negocio.",
    parameters: {
      type: "object",
      properties: {
        descripcion: { type: "string", description: "En qué gastó, en pocas palabras" },
        monto: { type: "number" },
        metodo_pago: { type: "string", enum: ["efectivo", "yape", "plin", "transferencia"] },
      },
      required: ["descripcion", "monto"],
    },
  },
  {
    type: "function",
    name: "registrar_retiro",
    description: "Registra plata que la persona sacó de la caja para ella misma o para su casa, no para el negocio: almuerzo, pasaje de los hijos, plata para la familia.",
    parameters: {
      type: "object",
      properties: {
        monto: { type: "number" },
        motivo: { type: "string", description: "Para qué la sacó, si lo dijo: almuerzo, la casa, el colegio" },
        metodo_pago: { type: "string", enum: ["efectivo", "yape", "plin", "transferencia"] },
      },
      required: ["monto"],
    },
  },
  {
    type: "function",
    name: "consultar_resumen_del_dia",
    description: "Obtiene ventas, gastos, retiros y caja del día, y en 'semana' la proporción de lo vendido que la persona sacó para ella en los últimos siete días.",
    parameters: {
      type: "object",
      properties: { fecha: { type: "string", description: "Fecha YYYY-MM-DD; si no se indica, hoy" } },
    },
  },
] as const;

/**
 * Los esquemas de arriba le dicen al modelo qué mandar; estos son la red por
 * si no lo hace. Un modelo manda `"300"` en vez de `300` y `"Efectivo"` en vez
 * de `"efectivo"` todo el tiempo, y rechazar por eso significa perder la venta
 * entera: el vendedor la dijo, Wari la confirmó y el libro quedó vacío. Vale
 * más anotarla con menos detalle que no anotarla.
 */
const METODOS = ["efectivo", "yape", "plin", "transferencia"] as const;

const metodoPago = z.preprocess((valor) => {
  if (typeof valor !== "string") return undefined;
  const limpio = valor.trim().toLowerCase();
  // Un método que no conocemos queda sin especificar, no tumba el movimiento.
  return (METODOS as readonly string[]).includes(limpio) ? limpio : undefined;
}, z.enum(METODOS).optional());

/** Acepta 300, "300", "300.50" y "S/ 300"; rechaza lo que no sea un número. */
const monto = z.preprocess((valor) => {
  if (typeof valor === "number") return valor;
  if (typeof valor !== "string") return valor;
  const numero = Number(valor.replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(numero) ? numero : valor;
}, z.number().positive());

const texto = z.preprocess(
  (valor) => (typeof valor === "string" && valor.trim() ? valor.trim() : undefined),
  z.string().optional(),
);

export const ventaSchema = z.object({
  descripcion: texto, monto, metodo_pago: metodoPago, contraparte: texto, transcripcion: texto,
});
export const gastoSchema = z.object({ descripcion: texto, monto, metodo_pago: metodoPago, transcripcion: texto });
export const retiroSchema = z.object({ monto, motivo: texto, metodo_pago: metodoPago, transcripcion: texto });
export const resumenSchema = z.object({ fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });
