import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import marca from "../../public/logo-simbolo.png";
import { GraficoFlujoCaja } from "../../components/GraficoFlujoCaja";
import { ListaMovimientos } from "../../components/ListaMovimientos";
import { LiveRefresh } from "../../components/LiveRefresh";
import { MicrofonoWari } from "../../components/MicrofonoWari";
import { ResumenDelDia } from "../../components/ResumenDelDia";
import { dashboardConfigurado, fechaLima, obtenerFlujo, obtenerMovimientos, obtenerResumen, obtenerVendedor, saludoLima } from "../../lib/data";
import { fraseDeLaSemana } from "../../lib/proporcion";
import { vendedorActual } from "../../lib/vendedorActual";
import type { TipoMovimiento } from "../../lib/types";

const TIPOS: Array<{ valor: TipoMovimiento | ""; rotulo: string }> = [
  { valor: "", rotulo: "Todos" },
  { valor: "venta", rotulo: "Ventas" },
  { valor: "gasto", rotulo: "Gastos" },
  { valor: "retiro", rotulo: "Retiros" },
];

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
  const [resumen, movimientos, flujo, vendedor] = await Promise.all([
    obtenerResumen(vendedorId), obtenerMovimientos(vendedorId, searchParams), obtenerFlujo(vendedorId, 7),
    obtenerVendedor(vendedorId),
  ]);
  const configurado = dashboardConfigurado();
  const fecha = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Lima" })
    .format(new Date(`${fechaLima()}T12:00:00-05:00`));
  const nombre = vendedor?.nombre ?? vendedor?.nombre_negocio ?? null;
  const invitado = vendedor?.es_invitado ?? false;
  const conFechas = Boolean(searchParams.desde || searchParams.hasta);

  return <main className="libro">
    <LiveRefresh />
    <header className="topbar">
      {/* El logo lleva a la portada. Nada en este encabezado parece un control sin serlo. */}
      <div className="topbar-izquierda">
        <Link href="/" className="topbar-marca" aria-label="RIMPILOT, ir a la portada"><Image src={marca} alt="" width={40} height={32} priority /></Link>
        <div>
          <p className="topbar-fecha">{fecha}</p>
          <h1>{invitado || !nombre ? saludoLima() : `${saludoLima()}, ${nombre}`}</h1>
        </div>
      </div>
      <form method="post" action="/api/cuenta/salir"><button type="submit" className="salir">{invitado ? "Terminar prueba" : "Salir"}</button></form>
    </header>

    {invitado && <aside className="aviso-invitado" role="status"><strong>Estás probando RIMPILOT.</strong> Este libro es solo tuyo y nadie más lo ve. Se borra cuando termines la prueba: <Link href="/crear-cuenta">crea tu cuenta</Link> para conservarlo.</aside>}
    {!configurado && <aside className="configuration-warning" role="status"><strong>Panel sin conectar.</strong> Configura las variables en <code>packages/dashboard/.env.local</code> para mostrar el libro real. No se muestran datos de demostración.</aside>}

    <ResumenDelDia resumen={resumen} fraseSemana={fraseDeLaSemana(flujo)} />

    <MicrofonoWari />

    <div className="content-grid">
      <section className="ledger-section" aria-labelledby="movimientos-titulo">
        <div className="section-heading">
          <h2 id="movimientos-titulo">Movimientos</h2>
          <p>{movimientos.length === 1 ? "1 registro" : `${movimientos.length} registros`}</p>
        </div>

        <nav className="pestanas" aria-label="Filtrar por tipo">
          {TIPOS.map(({ valor, rotulo }) => {
            const activa = (searchParams.tipo ?? "") === valor;
            return <Link key={rotulo} href={enlaceTipo(searchParams, valor)} className={`pestana${activa ? " activa" : ""}`} aria-current={activa ? "page" : undefined}>{rotulo}</Link>;
          })}
        </nav>

        {/* Las fechas quedan plegadas: casi siempre se mira el día de hoy. */}
        <details className="fechas" open={conFechas}>
          <summary>Filtrar por fecha <ChevronDown aria-hidden="true" size={16} /></summary>
          <form className="fechas-form">
            {searchParams.tipo && <input type="hidden" name="tipo" value={searchParams.tipo} />}
            <label>Desde<input name="desde" type="date" defaultValue={searchParams.desde} /></label>
            <label>Hasta<input name="hasta" type="date" defaultValue={searchParams.hasta} /></label>
            <button type="submit">Aplicar</button>
            {conFechas && <Link href={enlaceTipo({ tipo: searchParams.tipo }, searchParams.tipo ?? "")} className="fechas-quitar">Quitar fechas</Link>}
          </form>
        </details>

        <ListaMovimientos movimientos={movimientos} />
      </section>

      <section className="flow-section" aria-labelledby="flujo-titulo">
        <div className="section-heading">
          <h2 id="flujo-titulo">Últimos 7 días</h2>
          <p>Lo que entró y lo que salió</p>
        </div>
        <GraficoFlujoCaja puntos={flujo} />
      </section>
    </div>
  </main>;
}
