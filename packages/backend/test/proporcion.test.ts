import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fraseProporcion as delBackend } from "../src/services/resumen.js";
import { fraseProporcion as delPanel } from "../../dashboard/lib/proporcion.js";

/**
 * Regla 19: la frase la calcula el código. Hay dos copias —una la lee Wari en
 * voz alta y otra la muestra el panel— y el comentario de las dos pide tocarlas
 * juntas. Esta prueba es lo que hace cumplir ese pedido.
 */
const CASOS: Array<[number, number, string | null]> = [
  [75, 20, "1 de cada 4 soles que vendiste"],
  [300, 100, "1 de cada 3 soles que vendiste"],
  [3, 5, "más de la mitad de lo que vendiste"],
  [100, 50, "1 de cada 2 soles que vendiste"],
  [0, 10, null],
  [100, 0, null],
];

describe("proporción de retiros", () => {
  for (const [ventas, retiros, esperada] of CASOS) {
    it(`ventas ${ventas}, retiros ${retiros}`, () => {
      assert.equal(delBackend(ventas, retiros), esperada);
      assert.equal(delPanel(ventas, retiros), esperada);
    });
  }
});
