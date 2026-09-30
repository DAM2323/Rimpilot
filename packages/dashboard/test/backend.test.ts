import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { pedirConEspera } from "../lib/backend";

const fetchOriginal = globalThis.fetch;
const url = new URL("http://backend.test/navegador/token");

/** Un reloj falso: cada espera avanza el tiempo sin dormir de verdad. */
function relojFalso(): { ahora: () => number; espera: (ms: number) => Promise<void> } {
  let tiempo = 0;
  return { ahora: () => tiempo, espera: async (ms) => { tiempo += ms; } };
}

function respuestas(...estados: Array<number | "caido">): { llamadas: () => number } {
  let n = 0;
  globalThis.fetch = (async () => {
    const estado = estados[Math.min(n, estados.length - 1)];
    n += 1;
    if (estado === "caido") throw new TypeError("fetch failed");
    return new Response("{}", { status: estado });
  }) as typeof fetch;
  return { llamadas: () => n };
}

describe("pedir el token con el backend dormido", () => {
  afterEach(() => { globalThis.fetch = fetchOriginal; });

  it("espera mientras Render despierta y devuelve la primera respuesta buena", async () => {
    const contador = respuestas("caido", 502, 503, 200);
    const { ahora, espera } = relojFalso();
    const respuesta = await pedirConEspera(url, { method: "POST" }, espera, ahora);
    assert.equal(respuesta.status, 200);
    assert.equal(contador.llamadas(), 4);
  });

  it("un 403 es definitivo: no reintenta", async () => {
    const contador = respuestas(403, 200);
    const { ahora, espera } = relojFalso();
    assert.equal((await pedirConEspera(url, {}, espera, ahora)).status, 403);
    assert.equal(contador.llamadas(), 1);
  });

  it("se rinde después de un minuto con la última respuesta", async () => {
    const contador = respuestas(503);
    const { ahora, espera } = relojFalso();
    assert.equal((await pedirConEspera(url, {}, espera, ahora)).status, 503);
    assert.ok(contador.llamadas() > 1 && contador.llamadas() <= 25);
  });

  it("si nunca contesta, termina con el error de conexión", async () => {
    respuestas("caido");
    const { ahora, espera } = relojFalso();
    await assert.rejects(pedirConEspera(url, {}, espera, ahora), /fetch failed/);
  });
});
