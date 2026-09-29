import { entrar, entradaSchema } from "../../../../lib/cuentas";
import { permitir, quien } from "../../../../lib/limite";
import { aError, entrarAlLibro } from "../_comun";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  // Más estricto que el registro: acá es donde se prueban contraseñas.
  if (!permitir(`entrar:${quien(request)}`, 8)) {
    return aError("/entrar", "intentos");
  }

  const formulario = await request.formData();
  const volver = formulario.get("volver");
  const datos = entradaSchema.safeParse({
    email: formulario.get("email"),
    clave: formulario.get("clave"),
  });
  if (!datos.success) return aError("/entrar", "credenciales", volver as string | null);

  const resultado = await entrar(datos.data);
  if (!resultado.ok) return aError("/entrar", resultado.codigo, volver as string | null);
  return entrarAlLibro(resultado.vendedorId, volver);
}
