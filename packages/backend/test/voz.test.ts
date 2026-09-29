import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { vozElegida } from "../src/agent/voiceAgent.js";

describe("voz de Wari", () => {
  afterEach(() => { delete process.env.ASSEMBLYAI_VOZ; delete process.env.ASSEMBLYAI_VOZ_EN; });

  it("sin configurar usa lola, la única con acento nativo en español", () => {
    assert.equal(vozElegida(), "lola");
  });

  it("acepta una voz del catálogo, sin importar mayúsculas", () => {
    process.env.ASSEMBLYAI_VOZ = " Michael ";
    assert.equal(vozElegida(), "michael");
  });

  it("rechaza una voz que no existe en vez de dejar que la API la ignore", () => {
    // `diego` fue el error real: la API no avisa y habla con su voz por defecto.
    process.env.ASSEMBLYAI_VOZ = "diego";
    assert.throws(() => vozElegida(), /no está en el catálogo/);
  });

  it("en inglés usa una voz inglesa del catálogo, no la española", () => {
    process.env.ASSEMBLYAI_VOZ = "lola";
    assert.equal(vozElegida("en"), "jane");
  });

  it("la voz inglesa se cambia aparte y también se valida", () => {
    process.env.ASSEMBLYAI_VOZ_EN = "George";
    assert.equal(vozElegida("en"), "george");
    assert.equal(vozElegida("es"), "lola");
    process.env.ASSEMBLYAI_VOZ_EN = "james";
    assert.throws(() => vozElegida("en"), /no está en el catálogo/);
  });
});
