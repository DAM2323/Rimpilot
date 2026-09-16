/** 'retiro' es la plata que el vendedor sacó de la caja para él, no para el negocio. */
export type TipoMovimiento = "venta" | "gasto" | "retiro";

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

/** `saldoDelDia` es la caja: ventas − gastos − retiros. */
export type Resumen = { totalVentas: number; totalGastos: number; totalRetiros: number; saldoDelDia: number };
export type PuntoFlujo = { fecha: string; ventas: number; gastos: number; retiros: number };
