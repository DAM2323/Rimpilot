import Image from "next/image";
import Link from "next/link";
import marca from "../../public/logo.png";
import { SelectorIdioma } from "../../components/SelectorIdioma";
import { idiomaActual } from "../../lib/idiomaServidor";
import { mensajeDeError, textos } from "../../lib/textos";

export function generateMetadata() {
  return { title: { absolute: `${textos(idiomaActual()).puerta.crearMeta} | RIMPILOT` }, robots: { index: false, follow: false } };
}

export default function CrearCuenta({ searchParams }: { searchParams: { error?: string; volver?: string } }) {
  const idioma = idiomaActual();
  const t = textos(idioma).puerta;
  const error = mensajeDeError(idioma, searchParams.error);
  const aqui = searchParams.volver ? `/crear-cuenta?volver=${encodeURIComponent(searchParams.volver)}` : "/crear-cuenta";

  return <main className="puerta">
    <SelectorIdioma idioma={idioma} volver={aqui} />
    <Link href="/" className="puerta-marca">
      <Image src={marca} alt="RIMPILOT" width={160} height={126} priority />
    </Link>

    <section className="puerta-tarjeta">
      <h1>{t.crearTitulo}</h1>
      <p className="puerta-bajada">{t.crearBajada}</p>

      {error && <p className="puerta-error" role="alert">{error}</p>}

      <form method="post" action="/api/cuenta/registro">
        {searchParams.volver && <input type="hidden" name="volver" value={searchParams.volver} />}

        <label htmlFor="email">{t.correo}</label>
        <input id="email" name="email" type="email" autoComplete="email" required />

        <label htmlFor="clave">{t.clave}</label>
        <input id="clave" name="clave" type="password" autoComplete="new-password" required minLength={8} />
        <small className="puerta-ayuda">{t.minimo}</small>

        <label htmlFor="nombre">{t.nombre} <span>{t.opcional}</span></label>
        <input id="nombre" name="nombre" type="text" autoComplete="given-name" maxLength={80} />

        <label htmlFor="negocio">{t.negocio} <span>{t.opcional}</span></label>
        <input id="negocio" name="negocio" type="text" autoComplete="organization" maxLength={80} />

        <button type="submit">{t.crearBoton}</button>
      </form>

      <p className="puerta-pie">
        {t.conCuenta}{" "}
        <Link href={searchParams.volver ? `/entrar?volver=${encodeURIComponent(searchParams.volver)}` : "/entrar"}>
          {t.entra}
        </Link>
      </p>
    </section>
  </main>;
}
