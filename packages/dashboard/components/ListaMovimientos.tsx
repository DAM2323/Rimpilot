import Link from "next/link";
import { ChevronRight, HandCoins, ReceiptText, ShoppingBag } from "lucide-react";
import type { Idioma } from "../lib/idioma";
import { textos } from "../lib/textos";
import type { Movimiento } from "../lib/types";

/** En soles y con formato peruano en los dos idiomas: la plata es en soles. */
const money = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0 });
const icons = { venta: ShoppingBag, gasto: ReceiptText, retiro: HandCoins };

/**
 * Con la zona de Lima explícita: sin ella se usa la del servidor, que en tu
 * computadora coincide con Perú y en Vercel es UTC. Desplegado, cada hora salía
 * corrida cinco horas.
 */
function hora(value: string, lang: string): string { return new Intl.DateTimeFormat(lang, { hour: "numeric", minute: "2-digit", timeZone: "America/Lima" }).format(new Date(value)); }

export function ListaMovimientos({ movimientos, idioma }: { movimientos: Movimiento[]; idioma: Idioma }) {
  const { lang, lista: t } = textos(idioma);
  if (!movimientos.length) return <div className="empty-state"><ShoppingBag aria-hidden="true" size={26}/><h2>{t.vacioTitulo}</h2><p>{t.vacioTexto}</p></div>;
  return <div className="movement-list" role="list" aria-label={t.etiqueta}>
    {movimientos.map((movimiento) => {
      const Icon = icons[movimiento.tipo];
      return <Link className="movement" href={`/libro/movimiento/${movimiento.id}`} key={movimiento.id} role="listitem">
        <span className={`movement-icon ${movimiento.tipo}`}><Icon aria-hidden="true" size={18}/></span>
        <span className="movement-copy"><strong>{movimiento.descripcion}</strong><small>{t.tipos[movimiento.tipo]}{movimiento.contraparte ? ` · ${movimiento.contraparte}` : ""} · {hora(movimiento.creado_en, lang)}</small></span>
        <span className={`movement-amount ${movimiento.tipo}`}>{movimiento.tipo === "venta" ? "+" : "−"}{money.format(movimiento.monto)}</span>
        <ChevronRight aria-hidden="true" className="chevron" size={18}/>
      </Link>;
    })}
  </div>;
}
