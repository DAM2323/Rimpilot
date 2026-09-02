import { NextResponse } from "next/server";
import { obtenerMovimientos } from "../../../lib/data";
import type { TipoMovimiento } from "../../../lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") as TipoMovimiento | null;
  const movimientos = await obtenerMovimientos({ tipo: tipo ?? undefined, desde: searchParams.get("desde") ?? undefined, hasta: searchParams.get("hasta") ?? undefined });
  return NextResponse.json({ movimientos });
}
