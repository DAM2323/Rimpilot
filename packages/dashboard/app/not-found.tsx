import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { idiomaActual } from "../lib/idiomaServidor";
import { textos } from "../lib/textos";

export default function NotFound() {
  const t = textos(idiomaActual()).noEncontrada;
  return <main className="detail-page">
    <article className="detail-card not-found">
      <SearchX aria-hidden="true" size={30} />
      <h1>{t.titulo}</h1>
      <p>{t.texto}</p>
      <Link href="/" className="back-link"><ArrowLeft size={17} aria-hidden="true" /> {t.volver}</Link>
    </article>
  </main>;
}
