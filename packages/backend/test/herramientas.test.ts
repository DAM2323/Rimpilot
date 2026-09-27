import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { herramientas, retiroSchema, ventaSchema } from "../src/agent/tools.js";

describe("argumentos que manda el modelo", () => {
  it("acepta el monto como número, como texto y con el símbolo de soles", () => {
    for (const monto of [50, "50", "S/ 50", "S/50"]) {
      assert.equal(ventaSchema.parse({ descripcion: "polos", monto }).monto, 50);
    }
  });

  it("entiende la coma decimal", () => {
    assert.equal(ventaSchema.parse({ monto: "12,50" }).monto, 12.5);
  });

  it("rechaza un monto que no es número o no es positivo", () => {
    for (const monto of ["cincuenta", 0, -5, null]) {
      assert.equal(ventaSchema.safeParse({ monto }).success, false, `debería rechazar ${String(monto)}`);
    }
  });

  it("normaliza el método de pago y no tumba el movimiento si no lo conoce", () => {
    assert.equal(ventaSchema.parse({ monto: 5, metodo_pago: " Yape " }).metodo_pago, "yape");
    assert.equal(ventaSchema.parse({ monto: 5, metodo_pago: "tarjeta" }).metodo_pago, undefined);
  });

  it("un retiro solo necesita el monto", () => {
    assert.deepEqual(retiroSchema.parse({ monto: 20 }), { monto: 20 });
  });

  it("ninguna herramienta le pide al modelo la transcripción", () => {
    for (const herramienta of herramientas) {
      assert.equal("transcripcion" in herramienta.parameters.properties, false, herramienta.name);
    }
  });
});
