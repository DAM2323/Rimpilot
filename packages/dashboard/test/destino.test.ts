import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { destinoSeguro } from "../app/api/cuenta/_comun";

describe("a dónde vuelve alguien después de entrar", () => {
  it("respeta un enlace profundo dentro del libro", () => {
    assert.equal(destinoSeguro("/libro"), "/libro");
    assert.equal(destinoSeguro("/libro/movimiento/abc"), "/libro/movimiento/abc");
  });

  it("no sirve de redirect abierto", () => {
    const intentos = [
      "https://sitio-falso.example",
      "//sitio-falso.example",
      "/\\sitio-falso.example",
      "/libro\\..\\x",
      "/api/cuenta/salir",
      "/librotrampa",
      "",
      undefined,
      null,
      42,
    ];
    for (const volver of intentos) {
      assert.equal(destinoSeguro(volver), "/libro", String(volver));
    }
  });
});
