import { NextResponse } from "next/server";

/**
 * Emite el token con el que el navegador abre el WebSocket de voz.
 *
 * El `vendedor_id` sale de la sesión —la cabecera `x-vendedor` que escribe el
 * middleware después de verificar la firma de la cookie—, nunca del cuerpo de
 * la petición: si el navegador pudiera elegirlo, escribiría en el libro de
 * cualquiera. La clave interna y el secreto que firma el token no salen del
 * servidor.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const backendUrl = process.env.RIMPILOT_BACKEND_URL;
  const claveInterna = process.env.RIMPILOT_INTERNAL_KEY;

  if (!backendUrl || !claveInterna) {
    return NextResponse.json(
      { error: "Falta RIMPILOT_BACKEND_URL o RIMPILOT_INTERNAL_KEY en packages/dashboard/.env.local." },
      { status: 503 },
    );
  }

  // El middleware ya cierra esta ruta sin sesión; esto es el segundo cerrojo,
  // por si alguna vez cambia el matcher.
  const vendedorId = request.headers.get("x-vendedor");
  if (!vendedorId) {
    return NextResponse.json({ error: "Entra a tu libro antes de hablar con Wari." }, { status: 401 });
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(new URL("/navegador/token", backendUrl), {
      method: "POST",
      headers: { "content-type": "application/json", "x-rimpilot-clave": claveInterna },
      body: JSON.stringify({ vendedorId }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "El backend de voz no responde." }, { status: 502 });
  }

  if (!respuesta.ok) {
    // El detalle queda en el log del backend; al navegador no le decimos por qué.
    return NextResponse.json({ error: "El backend de voz rechazó la sesión." }, { status: 502 });
  }

  const datos = (await respuesta.json()) as { token?: unknown };
  if (typeof datos.token !== "string") {
    return NextResponse.json({ error: "El backend de voz no devolvió un token." }, { status: 502 });
  }
  return NextResponse.json({ token: datos.token }, { headers: { "cache-control": "no-store" } });
}
