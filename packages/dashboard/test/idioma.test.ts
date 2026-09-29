import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { idiomaDe, volverSeguro } from "../lib/idioma";
import { mensajeDeError, textos, type Textos } from "../lib/textos";
import { saludoLima } from "../lib/data";

describe("qué idioma se muestra", () => {
  it("un navegador en español ve español", () => {
    assert.equal(idiomaDe(undefined, "es-PE,es;q=0.9,en;q=0.8"), "es");
  });
  it("un navegador en inglés, o en cualquier otro idioma, ve inglés", () => {
    assert.equal(idiomaDe(undefined, "en-US,en;q=0.9"), "en");
    assert.equal(idiomaDe(undefined, "pt-BR,pt;q=0.9"), "en");
  });
  it("respeta el orden de preferencia de los q", () => {
    assert.equal(idiomaDe(undefined, "en;q=0.5, es;q=0.9"), "es");
  });
  it("la elección explícita gana al navegador", () => {
    assert.equal(idiomaDe("en", "es-PE"), "en");
    assert.equal(idiomaDe("es", "en-US"), "es");
  });
  it("sin ninguna pista queda en español, y una cookie inventada no cuenta", () => {
    assert.equal(idiomaDe(undefined, null), "es");
    assert.equal(idiomaDe("fr", undefined), "es");
  });
});

describe("a dónde vuelve el selector de idioma", () => {
  it("acepta rutas del propio sitio, con su consulta", () => {
    assert.equal(volverSeguro("/libro?tipo=venta"), "/libro?tipo=venta");
    assert.equal(volverSeguro("/entrar?volver=%2Flibro"), "/entrar?volver=%2Flibro");
  });
  it("no se deja usar como redirect abierto", () => {
    for (const trampa of ["https://otro.sitio", "//otro.sitio", "/\\otro.sitio", "javascript:alert(1)", undefined, 5]) {
      assert.equal(volverSeguro(trampa), "/");
    }
  });
});

/** Cada texto en español tiene su versión en inglés, con la misma forma. */
function mismaForma(a: unknown, b: unknown, ruta: string): void {
  if (typeof a === "function") { assert.equal(typeof b, "function", ruta); return; }
  if (Array.isArray(a)) {
    assert.ok(Array.isArray(b), ruta);
    assert.equal((b as unknown[]).length, a.length, `${ruta}: largo`);
    a.forEach((valor, i) => mismaForma(valor, (b as unknown[])[i], `${ruta}[${i}]`));
    return;
  }
  if (a && typeof a === "object") {
    assert.deepEqual(Object.keys(b as object).sort(), Object.keys(a).sort(), ruta);
    for (const clave of Object.keys(a)) mismaForma((a as Record<string, unknown>)[clave], (b as Record<string, unknown>)[clave], `${ruta}.${clave}`);
    return;
  }
  if (typeof a === "string") assert.ok(typeof b === "string" && b.length > 0, `${ruta}: falta el texto en inglés`);
}

describe("textos", () => {
  it("el inglés tiene todo lo que tiene el español", () => {
    const es: Textos = textos("es");
    const en: Textos = textos("en");
    // La nota sobre el idioma existe solo en inglés: en español no hace falta.
    const sinNota = (t: Textos) => ({ ...t, landing: { ...t.landing, notaIdioma: "-" } });
    mismaForma(sinNota(es), sinNota(en), "textos");
  });
  it("un ?error= conocido se traduce y uno inventado no se muestra", () => {
    assert.equal(mensajeDeError("en", "credenciales"), "Wrong email or password.");
    assert.equal(mensajeDeError("es", "credenciales"), "Correo o contraseña incorrectos.");
    assert.equal(mensajeDeError("es", "Tu cuenta fue bloqueada, llama al 999"), null);
    assert.equal(mensajeDeError("es", "toString"), null);
  });
  it("el saludo del libro también cambia de idioma", () => {
    assert.equal(saludoLima(new Date("2026-09-28T14:00:00Z"), "en"), "Good morning");
    assert.equal(saludoLima(new Date("2026-09-29T03:00:00Z"), "en"), "Good evening");
  });
});
