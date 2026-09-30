import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FiltroRepetidos } from "../src/agent/repetidos.js";

describe("movimientos repetidos", () => {
  const frase = "I sold one jacket for forty";

  it("cuatro llamadas iguales y a la vez escriben una sola fila", async () => {
    const filtro = new FiltroRepetidos();
    let escrituras = 0;
    const escribir = async (): Promise<string> => { escrituras += 1; return `mov-${escrituras}`; };
    const clave = FiltroRepetidos.clave("venta", 40, frase);

    const resultados = await Promise.all([1, 2, 3, 4].map(() => filtro.anotar(clave, escribir)));

    assert.equal(escrituras, 1);
    assert.deepEqual(resultados.map((r) => r.repetido), [false, true, true, true]);
    assert.ok(resultados.every((r) => r.id === "mov-1"));
  });

  it("la misma frase con otro monto o de otro tipo no es repetido", () => {
    const venta = FiltroRepetidos.clave("venta", 40, frase);
    assert.notEqual(venta, FiltroRepetidos.clave("venta", 14, frase));
    assert.notEqual(venta, FiltroRepetidos.clave("gasto", 40, frase));
  });

  it("dos ventas iguales dichas en dos frases distintas se anotan las dos", async () => {
    const filtro = new FiltroRepetidos();
    let escrituras = 0;
    const escribir = async (): Promise<string> => { escrituras += 1; return `mov-${escrituras}`; };
    await filtro.anotar(FiltroRepetidos.clave("venta", 40, frase), escribir);
    await filtro.anotar(FiltroRepetidos.clave("venta", 40, "Another jacket, forty"), escribir);
    assert.equal(escrituras, 2);
  });

  it("pasada la ventana, la misma frase se vuelve a anotar", async () => {
    let reloj = 0;
    const filtro = new FiltroRepetidos(1000, () => reloj);
    const clave = FiltroRepetidos.clave("retiro", 25, "I took 25 for my kids");
    await filtro.anotar(clave, async () => "a");
    reloj = 1500;
    assert.deepEqual(await filtro.anotar(clave, async () => "b"), { id: "b", repetido: false });
  });

  it("si la primera escritura falla, el reintento sí se anota", async () => {
    const filtro = new FiltroRepetidos();
    const clave = FiltroRepetidos.clave("gasto", 25, "I paid 25 for more stock");
    await assert.rejects(filtro.anotar(clave, async () => { throw new Error("base caída"); }));
    assert.deepEqual(await filtro.anotar(clave, async () => "ok"), { id: "ok", repetido: false });
  });
});
