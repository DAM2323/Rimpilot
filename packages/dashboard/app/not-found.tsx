import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return <main className="detail-page">
    <article className="detail-card not-found">
      <SearchX aria-hidden="true" size={30} />
      <h1>Esta página no existe</h1>
      <p>Puede que el movimiento se haya borrado, o que el enlace esté incompleto. Tu libro sigue intacto.</p>
      <Link href="/" className="back-link"><ArrowLeft size={17} aria-hidden="true" /> Volver al libro</Link>
    </article>
  </main>;
}
