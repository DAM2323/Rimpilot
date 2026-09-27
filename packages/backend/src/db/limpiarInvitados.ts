import "../env.js";
import { sql } from "./client.js";

/**
 * Borra los libros de prueba abandonados.
 *
 * "Terminar prueba" ya borra el libro de un invitado. Este script es para los
 * que cerraron la pestaña sin tocarlo: su libro queda en la base y nadie puede
 * volver a entrar, porque la cookie se fue con la pestaña.
 *
 * Por defecto NO borra nada: cuenta y muestra. Para borrar hay que pedirlo:
 *
 *   pnpm --filter @rimpilot/backend limpiar-invitados            # solo cuenta
 *   pnpm --filter @rimpilot/backend limpiar-invitados --borrar   # borra
 *
 * Solo toca filas con `es_invitado = true` y más viejas que las horas indicadas
 * (24 por defecto, `--horas=N` para cambiarlo): una cuenta registrada no entra
 * en ningún caso, y un invitado que está probando ahora mismo tampoco.
 */
const borrar = process.argv.includes("--borrar");
const argHoras = process.argv.find((arg) => arg.startsWith("--horas="));
const horas = argHoras ? Number(argHoras.split("=")[1]) : 24;
if (!Number.isFinite(horas) || horas < 1) {
  throw new Error("--horas tiene que ser un número de horas, 1 o más.");
}

const db = sql();
const [{ invitados, movimientos }] = await db<{ invitados: number; movimientos: number }[]>`
  SELECT
    COUNT(*)::int AS invitados,
    (SELECT COUNT(*)::int FROM movimientos m
       JOIN vendedores v ON v.id = m.vendedor_id
      WHERE v.es_invitado AND v.creado_en < now() - make_interval(hours => ${horas})) AS movimientos
  FROM vendedores
  WHERE es_invitado AND creado_en < now() - make_interval(hours => ${horas})
`;

console.log(`Libros de prueba de hace más de ${horas} h: ${invitados}, con ${movimientos} movimientos.`);

if (!borrar) {
  console.log("No se borró nada. Para borrarlos, repetí el comando con --borrar.");
} else if (invitados > 0) {
  await db.begin(async (tx) => {
    const viejos = tx`
      SELECT id FROM vendedores
      WHERE es_invitado AND creado_en < now() - make_interval(hours => ${horas})
    `;
    await tx`DELETE FROM movimientos WHERE vendedor_id IN (${viejos})`;
    await tx`DELETE FROM resumen_diario WHERE vendedor_id IN (${viejos})`;
    await tx`DELETE FROM vendedores WHERE id IN (${viejos}) AND es_invitado`;
  });
  console.log(`Borrados ${invitados} libros de prueba.`);
}

await db.end();
