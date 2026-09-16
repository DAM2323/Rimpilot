import { NextResponse } from "next/server";

/**
 * Emite el token con el que el navegador abre el WebSocket de voz.
 *
 * Esta ruta corre en el servidor y ya está detrás del Basic Auth del panel. El
 * `vendedor_id` sale de la variable de entorno, no del cuerpo de la petición:
 * el navegador no elige de quién es el libro donde se escribe. La clave interna
 * y el secreto que firma el token nunca salen del servidor.
 */
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const backendUrl = process.env.RIMPILOT_BACKEND_URL;
  const claveInterna = process.env.RIMPILOT_INTERNAL_KEY;
  const vendedorId = process.env.RIMPILOT_VENDOR_ID;

  if (!backendUrl || !claveInterna || !vendedorId) {
    return NextResponse.json(
      { error: "Falta RIMPILOT_BACKEND_URL, RIMPILOT_INTERNAL_KEY o RIMPILOT_VENDOR_ID en packages/dashboard/.env.local." },
      { status: 503 },
    );
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
