import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import marca from "../public/logo.png";
import { SelectorIdioma } from "../components/SelectorIdioma";
import { idiomaActual } from "../lib/idiomaServidor";
import { mensajeDeError, textos } from "../lib/textos";

/**
 * La puerta pública: qué es RIMPILOT antes de pedir nada.
 *
 * En español y de tú, como se habla en Perú: está hecho para vendedores
 * peruanos y verlo en su idioma es parte de lo que se muestra. Quien tiene el
 * navegador en otro idioma la ve en inglés, para poder probarlo sin adivinar;
 * los textos de los dos idiomas viven en `lib/textos.ts`.
 */
export function generateMetadata() {
  const { landing } = textos(idiomaActual());
  return {
    title: { absolute: landing.metaTitulo },
    description: landing.metaDescripcion,
    robots: { index: true, follow: true },
  };
}

export default function Landing({ searchParams }: { searchParams: { error?: string } }) {
  const idioma = idiomaActual();
  const t = textos(idioma).landing;
  const error = mensajeDeError(idioma, searchParams.error);
  const cuenta = [
    { rotulo: t.cuenta.vendiste, monto: "S/ 75", tono: "venta", signo: null },
    { rotulo: t.cuenta.gastaste, monto: "S/ 15", tono: "gasto", signo: "−" },
    { rotulo: t.cuenta.sacaste, monto: "S/ 20", tono: "retiro", signo: "−" },
    { rotulo: t.cuenta.queda, monto: "S/ 40", tono: "resultado", signo: "=" },
  ];

  const acciones = <div className="landing-acciones">
    <Link className="landing-cta" href="/crear-cuenta">{t.crear} <ArrowRight size={18} aria-hidden="true" /></Link>
    {/*
      Probar no pide correo ni contraseña: abre un libro vacío y propio para
      esa visita (regla 12, nada compartido). Es un formulario y no un
      enlace porque crea una cuenta, y eso no se hace con un GET.
    */}
    <form method="post" action="/api/cuenta/invitado">
      <button className="landing-cta-suave" type="submit">{t.probar}</button>
    </form>
  </div>;

  return <div className="landing-fondo"><main className="landing">
    <header className="landing-top">
      <Image className="landing-marca" src={marca} alt="RIMPILOT" width={200} height={157} priority />
      <div className="landing-top-derecha">
        <span className="landing-evento">{t.evento}</span>
        <SelectorIdioma idioma={idioma} volver="/" />
        <Link className="landing-entrar" href="/entrar">{t.entrar}</Link>
      </div>
    </header>

    <section className="landing-hero">
      <div className="landing-hero-texto">
        <h1>{t.titulo1}<br /><span>{t.titulo2}</span></h1>
        <p className="landing-bajada">{t.bajada}</p>
        <p className="landing-remate"><span className="landing-regla" aria-hidden="true" /><span>{t.remate} <em>{t.remateFuerte}</em></span></p>

        {error && <p className="landing-error" role="alert">{error}</p>}

        {acciones}
        <p className="landing-letra-chica">{t.letraChica}</p>
        {t.notaIdioma && <p className="landing-letra-chica">{t.notaIdioma}</p>}
      </div>

      {/*
        El producto funcionando, no una ilustración: el orbe de Wari, un pedazo
        de conversación y la cuenta que sale de ella. Es la misma cuenta que
        muestra el libro de verdad.
      */}
      <figure className="landing-demo" aria-label={t.demoEtiqueta}>
        <div className="landing-demo-wari">
          <div className="orbe" data-fase="demo" aria-hidden="true"><span className="orbe-halo" /><span className="orbe-nucleo" /></div>
          <p>{t.demoHablando}</p>
        </div>
        <ol className="conversacion">
          <li className="burbuja tu"><span className="burbuja-quien">{textos(idioma).wari.tu}</span><span className="burbuja-texto">{t.demoTu}</span></li>
          <li className="burbuja wari"><span className="burbuja-quien">Wari</span><span className="burbuja-texto">{t.demoWari}</span></li>
        </ol>
        <div className="cuenta cuenta-demo">
          <div className="cuenta-fila">
            {cuenta.map(({ rotulo, monto, tono, signo }) => (
              <div className={`cuenta-termino ${tono}`} key={tono}>
                {signo && <span className="cuenta-signo" aria-hidden="true">{signo}</span>}
                <div><p className="cuenta-rotulo">{rotulo}</p><p className="cuenta-monto">{monto}</p></div>
              </div>
            ))}
          </div>
        </div>
      </figure>
    </section>

    <section className="landing-problema">
      <h2>{t.problemaTitulo}</h2>
      <div>
        <p>{t.problema1}</p>
        <p>{t.problema2}<strong>{t.problema2Fuerte}</strong>.</p>
        <p>{t.problema3}<strong>{t.problema3Fuerte}</strong>.</p>
      </div>
    </section>

    <section className="landing-pasos" aria-labelledby="pasos-titulo">
      <h2 id="pasos-titulo">{t.pasosTitulo}</h2>
      <ol>
        {t.pasos.map(({ titulo, texto }, indice) => (
          <li key={titulo}>
            <span className="landing-paso-numero" aria-hidden="true">{indice + 1}</span>
            <h3>{titulo}</h3>
            <p>{texto}</p>
          </li>
        ))}
      </ol>
    </section>

    <section className="landing-piezas" aria-labelledby="piezas-titulo">
      <h2 id="piezas-titulo">{t.piezasTitulo}</h2>
      <p className="landing-piezas-bajada">{t.piezasBajada}</p>
      <div className="landing-piezas-grupos">
        {t.piezas.map(({ grupo, items }) => (
          <div key={grupo}>
            <h3>{grupo}</h3>
            <dl>
              {items.map(([nombre, texto]) => (
                <div key={nombre}><dt>{nombre}</dt><dd>{texto}</dd></div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>

    <section className="landing-cierre">
      <h2>{t.cierreTitulo}</h2>
      <p>{t.cierreTexto}</p>
      {acciones}
    </section>

    <footer className="landing-pie">
      <p>{t.pie}</p>
      <a href="https://github.com/DAM2323/Rimpilot">{t.codigo}</a>
    </footer>
  </main></div>;
}
