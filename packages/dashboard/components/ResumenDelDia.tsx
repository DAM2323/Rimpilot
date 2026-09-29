import { ArrowDownRight, ArrowUpRight, HandCoins, WalletCards } from "lucide-react";
import type { Resumen } from "../lib/types";

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
export function ResumenDelDia({ resumen, fraseSemana }: { resumen: Resumen; fraseSemana?: string | null }) {
  const terminos = [
    { signo: null, rotulo: "Vendiste", valor: resumen.totalVentas, icono: ArrowUpRight, tono: "venta" },
    { signo: "−", rotulo: "Gastaste en el negocio", valor: resumen.totalGastos, icono: ArrowDownRight, tono: "gasto" },
    { signo: "−", rotulo: "Sacaste para ti", valor: resumen.totalRetiros, icono: HandCoins, tono: "retiro" },
  ] as const;

  return <section className="cuenta" aria-labelledby="cuenta-titulo">
    <h2 id="cuenta-titulo" className="cuenta-titulo">La cuenta de hoy</h2>
    <div className="cuenta-fila">
      {terminos.map(({ signo, rotulo, valor, icono: Icono, tono }) => (
        <div className={`cuenta-termino ${tono}`} key={rotulo}>
          {signo && <span className="cuenta-signo"><span aria-hidden="true">{signo}</span><span className="solo-lector">menos</span></span>}
          <div>
            <p className="cuenta-rotulo"><Icono aria-hidden="true" size={15} />{rotulo}</p>
            <p className="cuenta-monto">{money.format(valor)}</p>
          </div>
        </div>
      ))}
      <div className="cuenta-termino resultado">
        <span className="cuenta-signo"><span aria-hidden="true">=</span><span className="solo-lector">igual a</span></span>
        <div>
          <p className="cuenta-rotulo"><WalletCards aria-hidden="true" size={15} />Te queda en caja</p>
          <p className="cuenta-monto">{money.format(resumen.saldoDelDia)}</p>
        </div>
      </div>
    </div>
    {fraseSemana && <p className="cuenta-semana">Esta semana sacaste para ti <strong>{fraseSemana}</strong>.</p>}
  </section>;
}
