import Link from "next/link";
import { ArrowLeft, BadgeCheck, FileAudio, ReceiptText } from "lucide-react";
import { notFound } from "next/navigation";
import { obtenerMovimiento } from "../../../../lib/data";

const money = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0 });
const labels = { venta: "Venta", gasto: "Gasto del negocio", retiro: "Retiro personal" };

export default async function MovimientoPage({ params }: { params: { id: string } }) {
  const movimiento = await obtenerMovimiento(params.id);
  if (!movimiento) notFound();
  return <main className="detail-page"><Link href="/libro" className="back-link"><ArrowLeft size={17} aria-hidden="true"/> Volver al libro</Link>
    <article className="detail-card"><div className="detail-top"><span className={`type-pill ${movimiento.tipo}`}>{labels[movimiento.tipo]}</span><time>{new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(movimiento.creado_en))}</time></div>
      <div className="detail-amount"><ReceiptText aria-hidden="true" size={23}/><div><p>{movimiento.descripcion}</p><strong>{money.format(movimiento.monto)}</strong></div></div>
      <dl className="detail-meta"><div><dt>Método de pago</dt><dd>{movimiento.metodo_pago ?? "No especificado"}</dd></div>{movimiento.contraparte && <div><dt>Contraparte</dt><dd>{movimiento.contraparte}</dd></div>}</dl>
      <section className="audit"><div className="audit-heading"><FileAudio size={19} aria-hidden="true"/><div><h2>Origen de este registro</h2><p>Lo que Wari te escuchó decir.</p></div><BadgeCheck size={20} aria-label="Registro auditable"/></div><blockquote>“{movimiento.transcripcion ?? "No se guardó una transcripción para este movimiento."}”</blockquote></section>
    </article>
  </main>;
}
