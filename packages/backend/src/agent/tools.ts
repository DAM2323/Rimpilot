import { z } from "zod";

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
        metodo_pago: { type: "string", enum: ["efectivo", "yape", "plin", "transferencia", "fiado"] },
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
      properties: { descripcion: { type: "string" }, monto: { type: "number" } },
      required: ["descripcion", "monto"],
    },
  },
  {
    type: "function",
    name: "registrar_cuenta_por_cobrar",
    description: "Registra dinero que le deben al vendedor por un fiado.",
    parameters: {
      type: "object",
      properties: {
        contraparte: { type: "string", description: "Quién le debe" },
        monto: { type: "number" },
        descripcion: { type: "string" },
      },
      required: ["contraparte", "monto"],
    },
  },
  {
    type: "function",
    name: "consultar_resumen_del_dia",
    description: "Obtiene ventas, gastos, saldo y dinero por cobrar del día para leérselo al vendedor.",
    parameters: {
      type: "object",
      properties: { fecha: { type: "string", description: "Fecha YYYY-MM-DD; si no se indica, hoy" } },
    },
  },
] as const;

export const ventaSchema = z.object({
  descripcion: z.string().min(1), monto: z.number().positive(),
  metodo_pago: z.enum(["efectivo", "yape", "plin", "transferencia", "fiado"]).optional(), contraparte: z.string().optional(),
});
export const gastoSchema = z.object({ descripcion: z.string().min(1), monto: z.number().positive() });
export const cobrarSchema = z.object({ contraparte: z.string().min(1), monto: z.number().positive(), descripcion: z.string().optional() });
export const resumenSchema = z.object({ fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });
