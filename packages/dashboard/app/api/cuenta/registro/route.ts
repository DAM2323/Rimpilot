import { registrar, registroSchema } from "../../../../lib/cuentas";
import { permitir, quien } from "../../../../lib/limite";
import { aError, entrarAlLibro } from "../_comun";

// bcrypt necesita Node; el Edge no lo tiene.
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  if (!permitir(`registro:${quien(request)}`, 10)) {
    return aError("/crear-cuenta", "intentos");
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
    // El primer campo que falló dice qué mensaje mostrar.
    const campo = datos.error.issues[0]?.path[0];
    const codigo = campo === "email" ? "correo_invalido" : campo === "clave" ? "clave_corta" : "datos";
    return aError("/crear-cuenta", codigo, volver as string | null);
  }

  const resultado = await registrar(datos.data);
  if (!resultado.ok) return aError("/crear-cuenta", resultado.codigo, volver as string | null);
  return entrarAlLibro(resultado.vendedorId, volver);
}
