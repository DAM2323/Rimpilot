import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import marca from "../../public/logo-simbolo.png";
import { GraficoFlujoCaja } from "../../components/GraficoFlujoCaja";
import { ListaMovimientos } from "../../components/ListaMovimientos";
import { LiveRefresh } from "../../components/LiveRefresh";
import { MicrofonoWari } from "../../components/MicrofonoWari";
import { ResumenDelDia } from "../../components/ResumenDelDia";
import { SelectorIdioma } from "../../components/SelectorIdioma";
import { dashboardConfigurado, fechaLima, obtenerFlujo, obtenerMovimientos, obtenerResumen, obtenerVendedor, saludoLima } from "../../lib/data";
import { idiomaActual } from "../../lib/idiomaServidor";
import { fraseDeLaSemana } from "../../lib/proporcion";
import { textos } from "../../lib/textos";
import { vendedorActual } from "../../lib/vendedorActual";
import type { TipoMovimiento } from "../../lib/types";

const TIPOS: Array<TipoMovimiento | ""> = ["", "venta", "gasto", "retiro"];

type Filtros = { tipo?: TipoMovimiento; desde?: string; hasta?: string };

/** El enlace de cada pestaña conserva las fechas que ya estaban elegidas. */
function enlaceTipo(filtros: Filtros, tipo: TipoMovimiento | ""): string {
  const parametros = new URLSearchParams();
  if (tipo) parametros.set("tipo", tipo);
  if (filtros.desde) parametros.set("desde", filtros.desde);
  if (filtros.hasta) parametros.set("hasta", filtros.hasta);
  const texto = parametros.toString();
  return texto ? `/libro?${texto}` : "/libro";
}

/** El libro muestra la plata y las transcripciones de una persona real. */
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export const dynamic = "force-dynamic";

export default async function Libro({ searchParams }: { searchParams: Filtros }) {
  const vendedorId = vendedorActual();
  const idioma = idiomaActual();
  const t = textos(idioma).libro;
  const [resumen, movimientos, flujo, vendedor] = await Promise.all([
    obtenerResumen(vendedorId), obtenerMovimientos(vendedorId, searchParams), obtenerFlujo(vendedorId, 7),
    obtenerVendedor(vendedorId),
  ]);
  const configurado = dashboardConfigurado();
  const fecha = new Intl.DateTimeFormat(textos(idioma).lang, { weekday: "long", day: "numeric", month: "long", timeZone: "America/Lima" })
    .format(new Date(`${fechaLima()}T12:00:00-05:00`));
  const nombre = vendedor?.nombre ?? vendedor?.nombre_negocio ?? null;
  const invitado = vendedor?.es_invitado ?? false;
  const conFechas = Boolean(searchParams.desde || searchParams.hasta);
  const saludo = saludoLima(new Date(), idioma);

  return <main className="libro">
    <LiveRefresh />
    <header className="topbar">
      {/* El logo lleva a la portada. Nada en este encabezado parece un control sin serlo. */}
      <div className="topbar-izquierda">
        <Link href="/" className="topbar-marca" aria-label={t.irPortada}><Image src={marca} alt="" width={40} height={32} priority /></Link>
        <div>
          <p className="topbar-fecha">{fecha}</p>
          <h1>{invitado || !nombre ? saludo : `${saludo}, ${nombre}`}</h1>
        </div>
      </div>
      <div className="topbar-derecha">
        <SelectorIdioma idioma={idioma} volver={enlaceTipo(searchParams, searchParams.tipo ?? "")} />
        <form method="post" action="/api/cuenta/salir"><button type="submit" className="salir">{invitado ? t.terminarPrueba : t.salir}</button></form>
      </div>
    </header>

    {invitado && <aside className="aviso-invitado" role="status"><strong>{t.invitadoFuerte}</strong>{t.invitadoTexto}<Link href="/crear-cuenta">{t.invitadoEnlace}</Link>{t.invitadoFin}</aside>}
    {!configurado && <aside className="configuration-warning" role="status"><strong>{t.sinConectarFuerte}</strong>{t.sinConectarTexto}</aside>}

    <ResumenDelDia resumen={resumen} fraseSemana={fraseDeLaSemana(flujo, idioma)} idioma={idioma} />

    <MicrofonoWari idioma={idioma} />

    <div className="content-grid">
      <section className="ledger-section" aria-labelledby="movimientos-titulo">
        <div className="section-heading">
          <h2 id="movimientos-titulo">{t.movimientos}</h2>
          <p>{t.registros(movimientos.length)}</p>
        </div>

        <nav className="pestanas" aria-label={t.filtrarTipo}>
          {TIPOS.map((valor) => {
            const activa = (searchParams.tipo ?? "") === valor;
            const rotulo = valor ? t.tipos[valor] : t.tipos.todos;
            return <Link key={valor || "todos"} href={enlaceTipo(searchParams, valor)} className={`pestana${activa ? " activa" : ""}`} aria-current={activa ? "page" : undefined}>{rotulo}</Link>;
          })}
        </nav>

        {/* Las fechas quedan plegadas: casi siempre se mira el día de hoy. */}
        <details className="fechas" open={conFechas}>
          <summary>{t.filtrarFecha} <ChevronDown aria-hidden="true" size={16} /></summary>
          <form className="fechas-form">
            {searchParams.tipo && <input type="hidden" name="tipo" value={searchParams.tipo} />}
            <label>{t.desde}<input name="desde" type="date" defaultValue={searchParams.desde} /></label>
            <label>{t.hasta}<input name="hasta" type="date" defaultValue={searchParams.hasta} /></label>
            <button type="submit">{t.aplicar}</button>
            {conFechas && <Link href={enlaceTipo({ tipo: searchParams.tipo }, searchParams.tipo ?? "")} className="fechas-quitar">{t.quitarFechas}</Link>}
          </form>
        </details>

        <ListaMovimientos movimientos={movimientos} idioma={idioma} />
      </section>

      <section className="flow-section" aria-labelledby="flujo-titulo">
        <div className="section-heading">
          <h2 id="flujo-titulo">{t.ultimos7}</h2>
          <p>{t.entroSalio}</p>
        </div>
        <GraficoFlujoCaja puntos={flujo} idioma={idioma} />
      </section>
    </div>
  </main>;
}
