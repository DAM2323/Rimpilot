import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Quién es el dueño del libro que se está mirando.
 *
 * El valor lo pone el middleware después de verificar la firma de la cookie, y
 * ahí mismo borra cualquier `x-vendedor` que haya mandado el cliente. Por eso
 * acá se puede confiar en la cabecera: no es un dato del navegador, es el
 * resultado de la verificación del servidor.
 *
 * No hay valor por defecto a propósito. Si esto se llamara desde una ruta que
 * el middleware no protege, lo correcto es mandar a la puerta, no mostrar el
 * libro de alguien.
 */
export function vendedorActual(): string {
  const vendedorId = headers().get("x-vendedor");
  if (!vendedorId) redirect("/entrar");
  return vendedorId;
}
