import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { crearStreamToken, verificarStreamToken } from "../src/agent/streamToken.js";

const VENDEDOR = "17fe889f-a61e-4e22-a7ad-bf07bf074e92";
const OTRO = "d3d8d4d8-1337-43bc-bfca-d687a60bfc50";

describe("token del stream de voz", () => {
  before(() => { process.env.STREAM_TOKEN_SECRET = "secreto-de-prueba-con-mas-de-32-caracteres"; });

  it("devuelve el vendedor de un token válido", () => {
    assert.equal(verificarStreamToken(crearStreamToken(VENDEDOR)), VENDEDOR);
  });

  it("no deja cambiar el vendedor conservando la firma", () => {
    const [, expira, firma] = crearStreamToken(VENDEDOR).split(".");
    assert.equal(verificarStreamToken(`${OTRO}.${expira}.${firma}`), null);
  });

  it("vence a los cinco minutos", () => {
    const ahora = Date.now();
    const token = crearStreamToken(VENDEDOR, ahora);
    assert.equal(verificarStreamToken(token, ahora + 299_000), VENDEDOR);
    assert.equal(verificarStreamToken(token, ahora + 301_000), null);
  });

  it("rechaza basura sin romperse", () => {
    for (const token of ["", "a.b", "a.b.c", "..", `${VENDEDOR}.x.y`]) {
      assert.equal(verificarStreamToken(token), null, token);
    }
  });
});
