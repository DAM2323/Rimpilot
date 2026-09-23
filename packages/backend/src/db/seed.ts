import "../env.js";
import { sql } from "./client.js";

/**
 * Carga un vendedor del canal telefónico: el que llama por Twilio no pasa por
 * la web, así que su fila la crea alguien acá. Quien entra por el navegador se
 * registra solo y no necesita este script.
 *
 * Regla 2: sin variables de entorno no hay identidad por defecto, el script
 * falla. Antes esto era un INSERT fijo dentro de schema.sql, que dejaba una
 * fila conocida en toda base creada con él.
 */
function requerido(nombre: string): string {
  const valor = process.env[nombre]?.trim();
  if (!valor) {
    throw new Error(`${nombre} es obligatoria: el seed no tiene valores por defecto. Definila antes de correrlo.`);
  }
  return valor;
}

const telefono = requerido("SEED_VENDOR_TELEFONO");
if (!/^\+?[0-9()\-.\s]{6,32}$/.test(telefono)) {
  throw new Error("SEED_VENDOR_TELEFONO no tiene forma de número de teléfono.");
}

// Opcionales, pero nunca inventados: si no vienen, la fila queda con NULL.
const nombre = process.env.SEED_VENDOR_NOMBRE?.trim() || null;
const negocio = process.env.SEED_VENDOR_NEGOCIO?.trim() || null;

const [vendedor] = await sql()<{ id: string; telefono: string }[]>`
  INSERT INTO vendedores (telefono, nombre, nombre_negocio)
  VALUES (${telefono}, ${nombre}, ${negocio})
  ON CONFLICT (telefono) DO UPDATE SET
    nombre = COALESCE(EXCLUDED.nombre, vendedores.nombre),
    nombre_negocio = COALESCE(EXCLUDED.nombre_negocio, vendedores.nombre_negocio)
  RETURNING id, telefono
`;

console.log(`Vendedor listo para ${vendedor.telefono}.`);
console.log(`Su id es ${vendedor.id}. Ya puede llamar y registrar movimientos por teléfono.`);

await sql().end();
