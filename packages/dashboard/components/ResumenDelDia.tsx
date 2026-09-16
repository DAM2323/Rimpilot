import { ArrowDownRight, ArrowUpRight, HandCoins, WalletCards } from "lucide-react";
import type { Resumen } from "../lib/types";

const money = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0 });

export function ResumenDelDia({ resumen }: { resumen: Resumen }) {
  // El orden cuenta la resta: ventas − gastos − retiros = caja. La caja va
  // última porque es el resultado, no un rubro más.
  const items = [
    { label: "Ventas de hoy", value: resumen.totalVentas, icon: ArrowUpRight, tone: "income" },
    { label: "Gastos de hoy", value: resumen.totalGastos, icon: ArrowDownRight, tone: "expense" },
    { label: "Sacaste para ti", value: resumen.totalRetiros, icon: HandCoins, tone: "retiro" },
    { label: "Caja disponible", value: resumen.saldoDelDia, icon: WalletCards, tone: "balance" },
  ];
  return <section className="summary-grid" aria-label="Resumen del día">
    {items.map(({ label, value, icon: Icon, tone }) => <article className={`summary-item ${tone}`} key={label}>
      <div className="summary-icon"><Icon aria-hidden="true" size={18} /></div>
      <p>{label}</p><strong>{money.format(value)}</strong>
    </article>)}
  </section>;
}
