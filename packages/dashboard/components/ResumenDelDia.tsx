import { ArrowDownRight, ArrowUpRight, HandCoins, WalletCards } from "lucide-react";
import type { Idioma } from "../lib/idioma";
import { textos } from "../lib/textos";
import type { Resumen } from "../lib/types";

/** En soles y con formato peruano en los dos idiomas: la plata es en soles. */
const money = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0 });

/**
 * La cuenta del día escrita como lo que es: una resta.
 *
 * Antes eran cuatro tarjetas iguales —ícono, rótulo, número— y la relación
 * entre los números había que adivinarla. Pero el producto entero es esa
 * relación: vendiste 75, te quedan 40, y la diferencia tiene nombre. Así que se
 * escribe con sus signos: ventas − gastos − lo que sacaste = lo que te queda.
 *
 * Los signos son texto, no adorno: un lector de pantalla lee la cuenta en orden
 * ("menos", "igual"), y quien no distingue el rosa del violeta la lee igual.
 */
export function ResumenDelDia({ resumen, fraseSemana, idioma }: { resumen: Resumen; fraseSemana?: string | null; idioma: Idioma }) {
  const t = textos(idioma).cuenta;
  const terminos = [
    { signo: null, rotulo: t.vendiste, valor: resumen.totalVentas, icono: ArrowUpRight, tono: "venta" },
    { signo: "−", rotulo: t.gastaste, valor: resumen.totalGastos, icono: ArrowDownRight, tono: "gasto" },
    { signo: "−", rotulo: t.sacaste, valor: resumen.totalRetiros, icono: HandCoins, tono: "retiro" },
  ] as const;

  return <section className="cuenta" aria-labelledby="cuenta-titulo">
    <h2 id="cuenta-titulo" className="cuenta-titulo">{t.titulo}</h2>
    <div className="cuenta-fila">
      {terminos.map(({ signo, rotulo, valor, icono: Icono, tono }) => (
        <div className={`cuenta-termino ${tono}`} key={tono}>
          {signo && <span className="cuenta-signo"><span aria-hidden="true">{signo}</span><span className="solo-lector">{t.menos}</span></span>}
          <div>
            <p className="cuenta-rotulo"><Icono aria-hidden="true" size={15} />{rotulo}</p>
            <p className="cuenta-monto">{money.format(valor)}</p>
          </div>
        </div>
      ))}
      <div className="cuenta-termino resultado">
        <span className="cuenta-signo"><span aria-hidden="true">=</span><span className="solo-lector">{t.igual}</span></span>
        <div>
          <p className="cuenta-rotulo"><WalletCards aria-hidden="true" size={15} />{t.queda}</p>
          <p className="cuenta-monto">{money.format(resumen.saldoDelDia)}</p>
        </div>
      </div>
    </div>
    {fraseSemana && <p className="cuenta-semana">{t.semana}<strong>{fraseSemana}</strong>.</p>}
  </section>;
}
