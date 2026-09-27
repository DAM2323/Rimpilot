import { NextResponse, type NextRequest } from "next/server";
import { borrarInvitado } from "../../../../lib/cuentas";
import { COOKIE_SESION, vendedorDeSesion } from "../../../../lib/sesion";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  // Si es un invitado, "Terminar prueba" borra su libro de verdad. El id sale
  // de la cookie firmada, nunca de algo que el cliente mande en el cuerpo.
  const vendedorId = await vendedorDeSesion(request.cookies.get(COOKIE_SESION)?.value).catch(() => null);
  if (vendedorId) await borrarInvitado(vendedorId);

  const respuesta = NextResponse.redirect(new URL("/", new URL(request.url).origin), { status: 303 });
  respuesta.cookies.delete(COOKIE_SESION);
  return respuesta;
}
