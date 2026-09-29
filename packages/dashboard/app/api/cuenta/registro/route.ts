import { registrar, registroSchema } from "../../../../lib/cuentas";
import { permitir, quien } from "../../../../lib/limite";
import { aError, entrarAlLibro } from "../_comun";

// bcrypt necesita Node; el Edge no lo tiene.
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const origen = new URL(request.url).origin;
  if (!permitir(`registro:${quien(request)}`, 10)) {
    return aError(origen, "/crear-cuenta", "Demasiados intentos. Espera unos minutos.");
  }

  const formulario = await request.formData();
  const volver = formulario.get("volver");
  const datos = registroSchema.safeParse({
    email: formulario.get("email"),
    clave: formulario.get("clave"),
    nombre: formulario.get("nombre") || undefined,
    negocio: formulario.get("negocio") || undefined,
  });
  if (!datos.success) {
    return aError(origen, "/crear-cuenta", datos.error.issues[0]?.message ?? "Revisa los datos.", volver as string | null);
  }

  const resultado = await registrar(datos.data);
  if (!resultado.ok) return aError(origen, "/crear-cuenta", resultado.mensaje, volver as string | null);
  return entrarAlLibro(origen, resultado.vendedorId, volver);
}
