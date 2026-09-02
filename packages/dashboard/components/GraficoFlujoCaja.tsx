import type { PuntoFlujo } from "../lib/types";

export function GraficoFlujoCaja({ puntos }: { puntos: PuntoFlujo[] }) {
  const max = Math.max(1, ...puntos.flatMap((point) => [point.ventas, point.gastos]));
  return <div className="chart" role="img" aria-label="Flujo de caja de los últimos siete días">
    <div className="chart-legend"><span><i className="sales-dot"/>Ventas</span><span><i className="expenses-dot"/>Gastos</span></div>
    <div className="bars">{puntos.map((point) => <div className="bar-day" key={point.fecha}>
      <div className="bar-pair"><i className="bar sales" style={{ height: `${Math.max(3, point.ventas / max * 100)}%` }} title={`Ventas: S/ ${point.ventas}`}/><i className="bar expenses" style={{ height: `${Math.max(3, point.gastos / max * 100)}%` }} title={`Gastos: S/ ${point.gastos}`}/></div>
      <small>{new Intl.DateTimeFormat("es-PE", { weekday: "narrow" }).format(new Date(`${point.fecha}T12:00:00`))}</small>
    </div>)}</div>
  </div>;
}
