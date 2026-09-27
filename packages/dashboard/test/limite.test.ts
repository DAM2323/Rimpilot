import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { permitir } from "../lib/limite";

describe("freno de intentos (regla 9)", () => {
  it("deja pasar hasta el máximo y frena el siguiente", () => {
    const t = Date.now();
    for (let i = 0; i < 8; i += 1) assert.equal(permitir("entrar:1.2.3.4", 8, t), true);
    assert.equal(permitir("entrar:1.2.3.4", 8, t), false);
  });

  it("cada origen lleva su propia cuenta", () => {
    const t = Date.now();
    for (let i = 0; i < 5; i += 1) permitir("invitado:9.9.9.9", 5, t);
    assert.equal(permitir("invitado:9.9.9.9", 5, t), false);
    assert.equal(permitir("invitado:8.8.8.8", 5, t), true);
  });

  it("pasados 15 minutos vuelve a dejar pasar", () => {
    const t = Date.now();
    for (let i = 0; i < 3; i += 1) permitir("registro:5.5.5.5", 3, t);
    assert.equal(permitir("registro:5.5.5.5", 3, t), false);
    assert.equal(permitir("registro:5.5.5.5", 3, t + 15 * 60 * 1000 + 1), true);
  });
});
