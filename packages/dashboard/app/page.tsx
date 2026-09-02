import { Filter, Mic, SlidersHorizontal } from "lucide-react";
import { GraficoFlujoCaja } from "../components/GraficoFlujoCaja";
import { ListaMovimientos } from "../components/ListaMovimientos";
import { LiveRefresh } from "../components/LiveRefresh";
import { ResumenDelDia } from "../components/ResumenDelDia";
import { obtenerFlujo, obtenerMovimientos, obtenerResumen } from "../lib/data";
import type { TipoMovimiento } from "../lib/types";

const types: Array<{ value: TipoMovimiento; label: string }> = [
  { value: "venta", label: "Ventas" }, { value: "gasto", label: "Gastos" }, { value: "cuenta_por_cobrar", label: "Por cobrar" }, { value: "cuenta_por_pagar", label: "Por pagar" },
];

export default async function Dashboard({ searchParams }: { searchParams: { tipo?: TipoMovimiento; desde?: string; hasta?: string } }) {
  const [resumen, movimientos, flujo] = await Promise.all([
    obtenerResumen(), obtenerMovimientos(searchParams), obtenerFlujo(7),
  ]);
  return <main className="app-shell">
    <LiveRefresh />
    <aside className="sidebar"><div className="brand-mark">R</div><div className="sidebar-line active"/><div className="sidebar-line"/><div className="sidebar-line"/></aside>
    <section className="workspace">
      <header className="topbar"><div><p className="kicker">Lunes, 1 de septiembre</p><h1>Buenos días, María</h1></div><div className="voice-status"><span className="pulse"/><Mic size={17} aria-hidden="true"/> Wari está listo</div></header>
      <section className="intro"><div><h2>Tu caja, clara.</h2><p>Así se movió tu negocio hoy. Cada registro viene directo de tu llamada.</p></div><span className="today">HOY</span></section>
      <ResumenDelDia resumen={resumen}/>
      <div className="content-grid">
        <section className="ledger-section"><div className="section-heading"><div><h2>Movimientos</h2><p>{movimientos.length} registros encontrados</p></div><SlidersHorizontal aria-hidden="true" size={19}/></div>
          <form className="filters"><Filter aria-hidden="true" size={16}/><label>Tipo<select name="tipo" defaultValue={searchParams.tipo ?? ""}><option value="">Todos</option>{types.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label><label>Desde<input name="desde" type="date" defaultValue={searchParams.desde}/></label><label>Hasta<input name="hasta" type="date" defaultValue={searchParams.hasta}/></label><button type="submit">Aplicar</button></form>
          <ListaMovimientos movimientos={movimientos}/>
        </section>
        <section className="flow-section"><div className="section-heading"><div><h2>Flujo de caja</h2><p>Últimos 7 días</p></div></div><GraficoFlujoCaja puntos={flujo}/><p className="chart-note">Tus ventas y gastos del día se actualizan cuando Wari registra un movimiento.</p></section>
      </div>
    </section>
  </main>;
}
