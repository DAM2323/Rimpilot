import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { vozElegida } from "../src/agent/voiceAgent.js";

describe("voz de Wari", () => {
  afterEach(() => { delete process.env.ASSEMBLYAI_VOZ; });

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
});
