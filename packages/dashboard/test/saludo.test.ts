import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { saludoLima } from "../lib/data";

describe("saludo del libro", () => {
  // Las horas van en UTC; Lima es UTC-5.
  it("a las 9 de la mañana de Lima dice buenos días", () => {
    assert.equal(saludoLima(new Date("2026-09-28T14:00:00Z")), "Buenos días");
  });
  it("a las 5 y media de la tarde de Lima dice buenas tardes, aunque en UTC sea de noche", () => {
    assert.equal(saludoLima(new Date("2026-09-28T22:34:00Z")), "Buenas tardes");
  });
  it("a las 10 de la noche de Lima dice buenas noches", () => {
    assert.equal(saludoLima(new Date("2026-09-29T03:00:00Z")), "Buenas noches");
  });
  it("de madrugada también es de noche", () => {
    assert.equal(saludoLima(new Date("2026-09-28T07:00:00Z")), "Buenas noches");
  });
});
