/**
 * Renderiza la portada de la convocatoria a PNG.
 *
 *   node docs/cover/render.mjs
 *
 * Inyecta Inter y el logo real como data URI antes de abrir la página, así el
 * HTML no depende de la red ni de rutas de node_modules al momento de pintar, y
 * el resultado es el mismo en cualquier máquina. Usa el Chromium que ya trae el
 * entorno; si Playwright no está instalado, lo dice y no inventa una portada.
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, "../..");
const SALIDA = join(aqui, "rimpilot-cover.png");
const ANCHO = 1920;
const ALTO = 1080;

function dataUri(ruta, tipo) {
  return `data:${tipo};base64,${readFileSync(ruta).toString("base64")}`;
}

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Falta Playwright: `pnpm add -D playwright` o corré esto donde ya esté instalado.");
  process.exit(1);
}

// Solo el subconjunto latino: es el que usa la portada y pesa una fracción.
// Se resuelve desde el panel, que es quien declara la fuente como dependencia.
const fuente = dataUri(
  require.resolve("@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", {
    paths: [join(raiz, "packages/dashboard")],
  }),
  "font/woff2",
);
const logo = dataUri(join(raiz, "packages/dashboard/public/logo.png"), "image/png");

const html = readFileSync(join(aqui, "plantilla.html"), "utf8")
  .replace("__FUENTE__", fuente)
  .replace("__LOGO__", logo);

const temporal = join(mkdtempSync(join(tmpdir(), "rimpilot-portada-")), "portada.html");
writeFileSync(temporal, html);

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const pagina = await navegador.newPage({ viewport: { width: ANCHO, height: ALTO }, deviceScaleFactor: 2 });
await pagina.goto(`file://${temporal}`);
await pagina.evaluate(() => document.fonts.ready);
await pagina.screenshot({ path: SALIDA });
await navegador.close();

console.log(`Portada escrita en ${SALIDA} (${ANCHO * 2}×${ALTO * 2})`);
