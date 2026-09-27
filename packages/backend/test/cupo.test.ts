import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { reiniciarCupos, sesionesActivas, tomarCupo } from "../src/agent/cupo.js";

// Valores por defecto: 5 a la vez, 20 por vendedor por día, 200 por día.
const LUNES = Date.parse("2026-09-28T15:00:00Z");
const MARTES = Date.parse("2026-09-29T15:00:00Z");

function liberarSiHay(cupo: ReturnType<typeof tomarCupo>): void {
  if ("liberar" in cupo) cupo.liberar();
}

describe("cupos de sesiones de voz (regla 17)", () => {
  beforeEach(() => reiniciarCupos());

  it("corta en la sexta sesión simultánea", () => {
    const abiertas = Array.from({ length: 5 }, (_, i) => tomarCupo(`v${i}`, LUNES));
    assert.ok(abiertas.every((cupo) => "liberar" in cupo));
    assert.deepEqual(tomarCupo("otro", LUNES), { rechazo: "simultaneas" });
  });

  it("liberar dos veces no resta dos cupos", () => {
    const cupo = tomarCupo("v", LUNES);
    assert.ok("liberar" in cupo);
    cupo.liberar();
    cupo.liberar();
    assert.equal(sesionesActivas(), 0);
  });

  it("un vendedor no pasa de 20 sesiones por día, aunque las cierre todas", () => {
    for (let i = 0; i < 20; i += 1) liberarSiHay(tomarCupo("juana", LUNES));
    assert.deepEqual(tomarCupo("juana", LUNES), { rechazo: "diaria_vendedor" });
    // A otro vendedor no le afecta.
    assert.ok("liberar" in tomarCupo("pedro", LUNES));
  });

  it("el tope diario total frena a quien abre muchos invitados", () => {
    for (let i = 0; i < 200; i += 1) liberarSiHay(tomarCupo(`invitado-${i}`, LUNES));
    assert.deepEqual(tomarCupo("invitado-nuevo", LUNES), { rechazo: "diaria_total" });
  });

  it("al cambiar el día de Lima las cuotas vuelven a empezar", () => {
    for (let i = 0; i < 20; i += 1) liberarSiHay(tomarCupo("juana", LUNES));
    assert.deepEqual(tomarCupo("juana", LUNES), { rechazo: "diaria_vendedor" });
    assert.ok("liberar" in tomarCupo("juana", MARTES));
  });

  it("el día es el de Lima, no el UTC del servidor", () => {
    // 03:00 UTC del martes todavía es lunes 22:00 en Lima.
    const lunesNocheEnLima = Date.parse("2026-09-29T03:00:00Z");
    for (let i = 0; i < 20; i += 1) liberarSiHay(tomarCupo("juana", LUNES));
    assert.deepEqual(tomarCupo("juana", lunesNocheEnLima), { rechazo: "diaria_vendedor" });
  });
});
