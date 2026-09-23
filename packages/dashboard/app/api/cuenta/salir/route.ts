import { NextResponse } from "next/server";
import { COOKIE_SESION } from "../../../../lib/sesion";

export async function POST(request: Request): Promise<Response> {
  const respuesta = NextResponse.redirect(new URL("/", new URL(request.url).origin), { status: 303 });
  respuesta.cookies.delete(COOKIE_SESION);
  return respuesta;
}
