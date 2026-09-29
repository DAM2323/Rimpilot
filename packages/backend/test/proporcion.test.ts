import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fraseProporcion as delBackend } from "../src/services/resumen.js";
import { fraseProporcion as delPanel } from "../../dashboard/lib/proporcion.js";

/**
 * Regla 19: la frase la calcula el código. Hay dos copias —una la lee Wari en
 * voz alta y otra la muestra el panel— y el comentario de las dos pide tocarlas
 * juntas. Esta prueba es lo que hace cumplir ese pedido, en los dos idiomas.
 */
const CASOS: Array<[number, number, string | null, string | null]> = [
  [75, 20, "1 de cada 4 soles que vendiste", "1 in every 4 soles you sold"],
  [300, 100, "1 de cada 3 soles que vendiste", "1 in every 3 soles you sold"],
  [3, 5, "más de la mitad de lo que vendiste", "more than half of what you sold"],
  [100, 50, "1 de cada 2 soles que vendiste", "1 in every 2 soles you sold"],
  [0, 10, null, null],
  [100, 0, null, null],
];

describe("proporción de retiros", () => {
  for (const [ventas, retiros, espanol, ingles] of CASOS) {
    it(`ventas ${ventas}, retiros ${retiros}`, () => {
      assert.equal(delBackend(ventas, retiros), espanol);
      assert.equal(delPanel(ventas, retiros), espanol);
      assert.equal(delBackend(ventas, retiros, "en"), ingles);
      assert.equal(delPanel(ventas, retiros, "en"), ingles);
    });
  }
});
