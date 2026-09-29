import Image from "next/image";
import Link from "next/link";
import { Filter } from "lucide-react";
import marca from "../../public/logo-simbolo.png";
import { GraficoFlujoCaja } from "../../components/GraficoFlujoCaja";
import { ListaMovimientos } from "../../components/ListaMovimientos";
import { LiveRefresh } from "../../components/LiveRefresh";
import { MicrofonoWari } from "../../components/MicrofonoWari";
import { ResumenDelDia } from "../../components/ResumenDelDia";
import { dashboardConfigurado, fechaLima, obtenerFlujo, obtenerMovimientos, obtenerResumen, obtenerVendedor, saludoLima } from "../../lib/data";
import { proporcionDeLaSemana } from "../../lib/proporcion";
import { vendedorActual } from "../../lib/vendedorActual";
import type { TipoMovimiento } from "../../lib/types";

const types: Array<{ value: TipoMovimiento; label: string }> = [
  { value: "venta", label: "Ventas" }, { value: "gasto", label: "Gastos" }, { value: "retiro", label: "Retiros" },
];

/** El libro muestra la plata y las transcripciones de una persona real. */
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: { tipo?: TipoMovimiento; desde?: string; hasta?: string } }) {
  const vendedorId = vendedorActual();
  const [resumen, movimientos, flujo, vendedor] = await Promise.all([
    obtenerResumen(vendedorId), obtenerMovimientos(vendedorId, searchParams), obtenerFlujo(vendedorId, 7),
    obtenerVendedor(vendedorId),
  ]);
  const configured = dashboardConfigurado();
  const fecha = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${fechaLima()}T12:00:00-05:00`));
  const nombre = vendedor?.nombre ?? vendedor?.nombre_negocio ?? "tu negocio";
  const invitado = vendedor?.es_invitado ?? false;
  return <main className="app-shell antialiased">
    <LiveRefresh />
    <section className="workspace">
      <header className="topbar">
        {/*
          Antes había una barra lateral con el logo y tres rayas que parecían un
          menú y no llevaban a ningún lado, y un "Wari está listo" que decía
          "listo" también con el micrófono apagado. Lo que parece un control
          tiene que serlo: el logo ahora lleva a la portada y el estado real del
          micrófono vive en su propio panel.
        */}
        <div className="topbar-izquierda">
          <Link href="/" className="topbar-marca" aria-label="RIMPILOT, ir a la portada"><Image src={marca} alt="" width={40} height={32} priority/></Link>
          <div><p className="kicker">{fecha}</p><h1>{invitado ? saludoLima() : `${saludoLima()}, ${nombre}`}</h1></div>
        </div>
        <form method="post" action="/api/cuenta/salir"><button type="submit" className="salir">{invitado ? "Terminar prueba" : "Salir"}</button></form>
      </header>
      {invitado && <aside className="aviso-invitado" role="status"><strong>Estás probando RIMPILOT.</strong> Este libro es solo tuyo y nadie más lo ve, pero se pierde cuando cierres la sesión. <Link href="/crear-cuenta">Creá tu cuenta</Link> para conservarlo.</aside>}
      {!configured && <aside className="configuration-warning" role="status"><strong>Panel sin conectar.</strong> Configura las variables en <code>packages/dashboard/.env.local</code> para mostrar el libro real. No se muestran datos de demostración.</aside>}
      <section className="intro"><div><h2>Tu caja, clara.</h2><p>Así se movió tu negocio hoy. Cada registro viene directo de tu voz.</p></div></section>
      <MicrofonoWari/>
      <ResumenDelDia resumen={resumen} proporcion={proporcionDeLaSemana(flujo)}/>
      <div className="content-grid">
        <section className="ledger-section"><div className="section-heading"><div><h2>Movimientos</h2><p>{movimientos.length === 1 ? "1 registro" : `${movimientos.length} registros`}</p></div></div>
          <form className="filters"><Filter aria-hidden="true" size={16}/><label>Tipo<select name="tipo" defaultValue={searchParams.tipo ?? ""}><option value="">Todos</option>{types.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label><label>Desde<input name="desde" type="date" defaultValue={searchParams.desde}/></label><label>Hasta<input name="hasta" type="date" defaultValue={searchParams.hasta}/></label><button type="submit">Aplicar</button></form>
          <ListaMovimientos movimientos={movimientos}/>
        </section>
        <section className="flow-section"><div className="section-heading"><div><h2>Flujo de caja</h2><p>Últimos 7 días</p></div></div><GraficoFlujoCaja puntos={flujo}/><p className="chart-note">Ventas, gastos y retiros se actualizan solos cuando Wari registra un movimiento.</p></section>
      </div>
    </section>
  </main>;
}
