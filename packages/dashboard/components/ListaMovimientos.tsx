import Link from "next/link";
import { ChevronRight, HandCoins, ReceiptText, ShoppingBag } from "lucide-react";
import type { Movimiento } from "../lib/types";

const money = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0 });
const labels = { venta: "Venta", gasto: "Gasto", cuenta_por_cobrar: "Por cobrar", cuenta_por_pagar: "Por pagar" };
const icons = { venta: ShoppingBag, gasto: ReceiptText, cuenta_por_cobrar: HandCoins, cuenta_por_pagar: HandCoins };

function hora(value: string): string { return new Intl.DateTimeFormat("es-PE", { hour: "numeric", minute: "2-digit" }).format(new Date(value)); }

export function ListaMovimientos({ movimientos }: { movimientos: Movimiento[] }) {
  if (!movimientos.length) return <div className="empty-state"><ShoppingBag aria-hidden="true" size={26}/><h2>Aún no hay movimientos</h2><p>Llama a Wari y cuéntale lo que vendiste o gastaste. Aparecerá aquí automáticamente.</p></div>;
  return <div className="movement-list" role="list" aria-label="Movimientos">
    {movimientos.map((movimiento) => {
      const Icon = icons[movimiento.tipo];
      return <Link className="movement" href={`/movimiento/${movimiento.id}`} key={movimiento.id} role="listitem">
        <span className={`movement-icon ${movimiento.tipo}`}><Icon aria-hidden="true" size={18}/></span>
        <span className="movement-copy"><strong>{movimiento.descripcion}</strong><small>{labels[movimiento.tipo]}{movimiento.contraparte ? ` · ${movimiento.contraparte}` : ""} · {hora(movimiento.creado_en)}</small></span>
        <span className={`movement-amount ${movimiento.tipo}`}>{movimiento.tipo === "gasto" ? "−" : "+"}{money.format(movimiento.monto)}</span>
        <ChevronRight aria-hidden="true" className="chevron" size={18}/>
      </Link>;
    })}
  </div>;
}
