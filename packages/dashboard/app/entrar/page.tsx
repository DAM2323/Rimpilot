import Image from "next/image";
import Link from "next/link";
import marca from "../../public/logo.png";
import { SelectorIdioma } from "../../components/SelectorIdioma";
import { idiomaActual } from "../../lib/idiomaServidor";
import { mensajeDeError, textos } from "../../lib/textos";

export function generateMetadata() {
  return { title: { absolute: `${textos(idiomaActual()).puerta.entrarMeta} | RIMPILOT` }, robots: { index: false, follow: false } };
}

export default function Entrar({ searchParams }: { searchParams: { error?: string; volver?: string } }) {
  const idioma = idiomaActual();
  const t = textos(idioma).puerta;
  const error = mensajeDeError(idioma, searchParams.error);
  const aqui = searchParams.volver ? `/entrar?volver=${encodeURIComponent(searchParams.volver)}` : "/entrar";

  return <main className="puerta">
    <SelectorIdioma idioma={idioma} volver={aqui} />
    <Link href="/" className="puerta-marca">
      <Image src={marca} alt="RIMPILOT" width={160} height={126} priority />
    </Link>

    <section className="puerta-tarjeta">
      <h1>{t.entrarTitulo}</h1>
      <p className="puerta-bajada">{t.entrarBajada}</p>

      {error && <p className="puerta-error" role="alert">{error}</p>}

      <form method="post" action="/api/cuenta/entrar">
        {/* A dónde volvía la persona. El servidor solo acepta rutas del libro. */}
        {searchParams.volver && <input type="hidden" name="volver" value={searchParams.volver} />}

        <label htmlFor="email">{t.correo}</label>
        <input id="email" name="email" type="email" autoComplete="email" required />

        <label htmlFor="clave">{t.clave}</label>
        <input id="clave" name="clave" type="password" autoComplete="current-password" required />

        <button type="submit">{t.entrarBoton}</button>
      </form>

      <p className="puerta-pie">
        {t.sinLibro}{" "}
        <Link href={searchParams.volver ? `/crear-cuenta?volver=${encodeURIComponent(searchParams.volver)}` : "/crear-cuenta"}>
          {t.creaCuenta}
        </Link>
      </p>
    </section>
  </main>;
}
