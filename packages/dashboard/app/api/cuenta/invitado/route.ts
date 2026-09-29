import { crearInvitado } from "../../../../lib/cuentas";
import { permitir, quien } from "../../../../lib/limite";
import { aError, entrarAlLibro } from "../_comun";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  // Cada invitado deja una fila en la base: sin freno, es gratis llenarla.
  if (!permitir(`invitado:${quien(request)}`, 5)) {
    return aError("/", "invitados");
  }

  const resultado = await crearInvitado();
  if (!resultado.ok) return aError("/", resultado.codigo);
  return entrarAlLibro(resultado.vendedorId);
}
