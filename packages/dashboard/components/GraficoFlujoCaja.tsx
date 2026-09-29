import type { Idioma } from "../lib/idioma";
import { textos } from "../lib/textos";
import type { PuntoFlujo } from "../lib/types";

// El retiro sale de la caja igual que el gasto, así que un gráfico de flujo que
// solo mostrara ventas y gastos ya no diría lo que dice el título.
const series = [
  { clave: "ventas", clase: "sales" },
  { clave: "gastos", clase: "expenses" },
  { clave: "retiros", clase: "withdrawals" },
] as const;

export function GraficoFlujoCaja({ puntos, idioma }: { puntos: PuntoFlujo[]; idioma: Idioma }) {
  const { lang, grafico: t } = textos(idioma);
  const max = Math.max(1, ...puntos.flatMap((point) => series.map(({ clave }) => point[clave])));
  return <div className="chart" role="img" aria-label={t.etiqueta}>
    <div className="chart-legend">{series.map(({ clave, clase }) => <span key={clase}><i className={`${clase}-dot`}/>{t.series[clave]}</span>)}</div>
    <div className="bars">{puntos.map((point) => <div className="bar-day" key={point.fecha}>
      <div className="bar-pair">{series.map(({ clave, clase }) => <i key={clase} className={`bar ${clase}`} style={{ height: `${Math.max(3, point[clave] / max * 100)}%` }} title={`${t.series[clave]}: S/ ${point[clave]}`}/>)}</div>
      <small>{new Intl.DateTimeFormat(lang, { weekday: "narrow" }).format(new Date(`${point.fecha}T12:00:00`))}</small>
    </div>)}</div>
  </div>;
}
