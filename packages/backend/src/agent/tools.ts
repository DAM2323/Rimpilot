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
        metodo_pago: { type: "string", enum: ["efectivo", "yape", "plin", "transferencia"] },
        contraparte: { type: "string", description: "A quién vendió, si lo mencionó" },
        transcripcion: { type: "string", description: "Fragmento exacto dicho por la persona para esta venta" },
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
        transcripcion: { type: "string", description: "Fragmento exacto dicho por la persona para este gasto" },
      },
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
        transcripcion: { type: "string", description: "Fragmento exacto dicho por la persona para este fiado" },
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
  metodo_pago: z.enum(["efectivo", "yape", "plin", "transferencia"]).optional(), contraparte: z.string().optional(), transcripcion: z.string().min(1).optional(),
});
export const gastoSchema = z.object({ descripcion: z.string().min(1), monto: z.number().positive(), metodo_pago: z.enum(["efectivo", "yape", "plin", "transferencia"]).optional(), transcripcion: z.string().min(1).optional() });
export const cobrarSchema = z.object({ contraparte: z.string().min(1), monto: z.number().positive(), descripcion: z.string().optional(), transcripcion: z.string().min(1).optional() });
export const resumenSchema = z.object({ fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });
