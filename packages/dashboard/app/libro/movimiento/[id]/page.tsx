import Link from "next/link";
import { ArrowLeft, FileAudio, ReceiptText } from "lucide-react";
import { notFound } from "next/navigation";
import { obtenerMovimiento } from "../../../../lib/data";
import { idiomaActual } from "../../../../lib/idiomaServidor";
import { textos } from "../../../../lib/textos";
import { vendedorActual } from "../../../../lib/vendedorActual";

/** En soles y con formato peruano en los dos idiomas: la plata es en soles. */
const money = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0 });

export default async function MovimientoPage({ params }: { params: { id: string } }) {
  const movimiento = await obtenerMovimiento(vendedorActual(), params.id);
  if (!movimiento) notFound();
  const { lang, detalle: t } = textos(idiomaActual());
  const metodo = movimiento.metodo_pago ? t.metodos[movimiento.metodo_pago] ?? movimiento.metodo_pago : t.sinMetodo;
  return <main className="detail-page"><Link href="/libro" className="back-link"><ArrowLeft size={17} aria-hidden="true"/> {t.volver}</Link>
    <article className="detail-card"><div className="detail-top"><span className={`type-pill ${movimiento.tipo}`}>{t.tipos[movimiento.tipo]}</span><time>{new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(movimiento.creado_en))}</time></div>
      <div className="detail-amount"><ReceiptText aria-hidden="true" size={23}/><div><p>{movimiento.descripcion}</p><strong>{money.format(movimiento.monto)}</strong></div></div>
      <dl className="detail-meta"><div><dt>{t.metodo}</dt><dd>{metodo}</dd></div>{movimiento.contraparte && <div><dt>{t.contraparte}</dt><dd>{movimiento.contraparte}</dd></div>}</dl>
      {/* La frase se muestra como se dijo, en el idioma en que se dijo: es la prueba de origen. */}
      <section className="audit"><div className="audit-heading"><FileAudio size={19} aria-hidden="true"/><div><h2>{t.origen}</h2><p>{t.origenBajada}</p></div></div><blockquote>{movimiento.transcripcion ?? t.sinTranscripcion}</blockquote></section>
    </article>
  </main>;
}
