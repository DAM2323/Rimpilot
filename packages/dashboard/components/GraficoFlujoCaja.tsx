import type { PuntoFlujo } from "../lib/types";

// El retiro sale de la caja igual que el gasto, así que un gráfico de flujo que
// solo mostrara ventas y gastos ya no diría lo que dice el título.
const series = [
  { clave: "ventas", etiqueta: "Ventas", clase: "sales" },
  { clave: "gastos", etiqueta: "Gastos", clase: "expenses" },
  { clave: "retiros", etiqueta: "Retiros", clase: "withdrawals" },
] as const;

export function GraficoFlujoCaja({ puntos }: { puntos: PuntoFlujo[] }) {
  const max = Math.max(1, ...puntos.flatMap((point) => series.map(({ clave }) => point[clave])));
  return <div className="chart" role="img" aria-label="Ventas, gastos y retiros de los últimos siete días">
    <div className="chart-legend">{series.map(({ etiqueta, clase }) => <span key={clase}><i className={`${clase}-dot`}/>{etiqueta}</span>)}</div>
    <div className="bars">{puntos.map((point) => <div className="bar-day" key={point.fecha}>
      <div className="bar-pair">{series.map(({ clave, etiqueta, clase }) => <i key={clase} className={`bar ${clase}`} style={{ height: `${Math.max(3, point[clave] / max * 100)}%` }} title={`${etiqueta}: S/ ${point[clave]}`}/>)}</div>
      <small>{new Intl.DateTimeFormat("es-PE", { weekday: "narrow" }).format(new Date(`${point.fecha}T12:00:00`))}</small>
    </div>)}</div>
  </div>;
}
