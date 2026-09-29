import { crearInvitado } from "../../../../lib/cuentas";
import { permitir, quien } from "../../../../lib/limite";
import { aError, entrarAlLibro } from "../_comun";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const origen = new URL(request.url).origin;
  // Cada invitado deja una fila en la base: sin freno, es gratis llenarla.
  if (!permitir(`invitado:${quien(request)}`, 5)) {
    return aError(origen, "/", "invitados");
  }

  const resultado = await crearInvitado();
  if (!resultado.ok) return aError(origen, "/", resultado.codigo);
  return entrarAlLibro(origen, resultado.vendedorId);
}
