import Link from "next/link";
import { ChevronRight, HandCoins, ReceiptText, ShoppingBag } from "lucide-react";
import type { Movimiento } from "../lib/types";

const money = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0 });
const labels = { venta: "Venta", gasto: "Gasto", retiro: "Retiro" };
const icons = { venta: ShoppingBag, gasto: ReceiptText, retiro: HandCoins };

/**
 * Con la zona de Lima explícita: sin ella se usa la del servidor, que en tu
 * computadora coincide con Perú y en Vercel es UTC. Desplegado, cada hora salía
 * corrida cinco horas.
 */
function hora(value: string): string { return new Intl.DateTimeFormat("es-PE", { hour: "numeric", minute: "2-digit", timeZone: "America/Lima" }).format(new Date(value)); }

export function ListaMovimientos({ movimientos }: { movimientos: Movimiento[] }) {
  if (!movimientos.length) return <div className="empty-state"><ShoppingBag aria-hidden="true" size={26}/><h2>Aún no hay movimientos</h2><p>Háblale a Wari y cuéntale lo que vendiste, lo que gastaste y lo que sacaste para ti. Aparecerá aquí automáticamente.</p></div>;
  return <div className="movement-list" role="list" aria-label="Movimientos">
    {movimientos.map((movimiento) => {
      const Icon = icons[movimiento.tipo];
      return <Link className="movement" href={`/libro/movimiento/${movimiento.id}`} key={movimiento.id} role="listitem">
        <span className={`movement-icon ${movimiento.tipo}`}><Icon aria-hidden="true" size={18}/></span>
        <span className="movement-copy"><strong>{movimiento.descripcion}</strong><small>{labels[movimiento.tipo]}{movimiento.contraparte ? ` · ${movimiento.contraparte}` : ""} · {hora(movimiento.creado_en)}</small></span>
        <span className={`movement-amount ${movimiento.tipo}`}>{movimiento.tipo === "venta" ? "+" : "−"}{money.format(movimiento.monto)}</span>
        <ChevronRight aria-hidden="true" className="chevron" size={18}/>
      </Link>;
    })}
  </div>;
}
