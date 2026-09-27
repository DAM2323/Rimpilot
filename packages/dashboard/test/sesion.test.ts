import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { crearSesion, opcionesCookie, vendedorDeSesion } from "../lib/sesion";

const JUANA = "17fe889f-a61e-4e22-a7ad-bf07bf074e92";
const OTRA = "d3d8d4d8-1337-43bc-bfca-d687a60bfc50";

describe("sesión del panel", () => {
  before(() => { process.env.RIMPILOT_SESSION_SECRET = "secreto-de-prueba-con-mas-de-32-caracteres"; });

  it("devuelve el vendedor de una cookie válida", async () => {
    assert.equal(await vendedorDeSesion(await crearSesion(JUANA)), JUANA);
  });

  it("cambiar el UUID de la cookie no abre el libro de otra persona", async () => {
    const [, expira, firma] = (await crearSesion(JUANA)).split(".");
    assert.equal(await vendedorDeSesion(`${OTRA}.${expira}.${firma}`), null);
  });

  it("alargar la fecha de vencimiento invalida la firma", async () => {
    const [id, , firma] = (await crearSesion(JUANA)).split(".");
    assert.equal(await vendedorDeSesion(`${id}.9999999999.${firma}`), null);
  });

  it("vence a los 30 días", async () => {
    const ahora = Date.now();
    const token = await crearSesion(JUANA, ahora);
    assert.equal(await vendedorDeSesion(token, ahora + 29 * 86_400_000), JUANA);
    assert.equal(await vendedorDeSesion(token, ahora + 31 * 86_400_000), null);
  });

  it("rechaza lo que no tiene forma de sesión", async () => {
    for (const token of [undefined, "", "a.b", "no-es-uuid.1.x", `${JUANA}.1`]) {
      assert.equal(await vendedorDeSesion(token), null, String(token));
    }
  });

  it("un secreto corto no firma nada: falla en vez de firmar débil", async () => {
    const guardado = process.env.RIMPILOT_SESSION_SECRET;
    process.env.RIMPILOT_SESSION_SECRET = "corto";
    await assert.rejects(() => crearSesion(JUANA), /al menos 32/);
    process.env.RIMPILOT_SESSION_SECRET = guardado;
  });

  it("la cookie es httpOnly y sameSite strict (regla 10)", () => {
    const opciones = opcionesCookie();
    assert.equal(opciones.httpOnly, true);
    assert.equal(opciones.sameSite, "strict");
  });
});
