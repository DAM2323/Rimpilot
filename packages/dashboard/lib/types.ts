export type TipoMovimiento = "venta" | "gasto" | "cuenta_por_cobrar" | "cuenta_por_pagar";

export type Movimiento = {
  id: string;
  tipo: TipoMovimiento;
  descripcion: string;
  monto: number;
  contraparte: string | null;
  metodo_pago: string | null;
  transcripcion: string | null;
  creado_en: string;
};

export type Resumen = { totalVentas: number; totalGastos: number; saldoDelDia: number; totalPorCobrar: number };
export type PuntoFlujo = { fecha: string; ventas: number; gastos: number };
