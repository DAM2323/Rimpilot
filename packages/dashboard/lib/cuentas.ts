import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { z } from "zod";

/**
 * Crear y verificar cuentas. Corre solo en el servidor: usa la clave de
 * servicio de Supabase, que nunca llega al navegador.
 */

/** Regla 10: costo real, no el mínimo que la librería acepte. */
const COSTO_BCRYPT = 12;

export const registroSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ese correo no parece válido."),
  clave: z.string().min(8, "La contraseña necesita al menos 8 caracteres.").max(200),
  nombre: z.string().trim().min(1).max(80).optional(),
  negocio: z.string().trim().min(1).max(80).optional(),
});

export const entradaSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ese correo no parece válido."),
  clave: z.string().min(1).max(200),
});

function db(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

export type Resultado = { ok: true; vendedorId: string } | { ok: false; mensaje: string };

export async function registrar(datos: z.infer<typeof registroSchema>): Promise<Resultado> {
  const cliente = db();
  const { data: existente } = await cliente.from("vendedores").select("id").eq("email", datos.email).maybeSingle();
  if (existente) return { ok: false, mensaje: "Ya hay una cuenta con ese correo. Prueba entrando." };

  const { data, error } = await cliente.from("vendedores").insert({
    email: datos.email,
    clave_hash: await bcrypt.hash(datos.clave, COSTO_BCRYPT),
    nombre: datos.nombre ?? null,
    nombre_negocio: datos.negocio ?? null,
  }).select("id").single();

  if (error || !data) {
    // Al vendedor se le da un mensaje parejo; el motivo real queda en el log del
    // servidor. Sin esto, un fallo de base es indistinguible de uno de red.
    console.error("registro: no se pudo crear el vendedor", error);
    return { ok: false, mensaje: "No pudimos crear la cuenta. Prueba de nuevo." };
  }
  return { ok: true, vendedorId: data.id as string };
}

export async function entrar(datos: z.infer<typeof entradaSchema>): Promise<Resultado> {
  const { data } = await db().from("vendedores").select("id,clave_hash").eq("email", datos.email).maybeSingle();

  /**
   * Se compara igual cuando el correo no existe, contra un hash de descarte.
   * Si se cortara antes, el tiempo de respuesta diría cuáles correos están
   * registrados y cuáles no.
   */
  const hash = (data?.clave_hash as string | undefined)
    ?? "$2a$12$eImiTXuWVxfM37uY4JANjQ.pP8VqwlHkC3UdzC1mKcTRuNqZwFMx2";
  const coincide = await bcrypt.compare(datos.clave, hash);

  // Un solo mensaje para los dos casos: no confirmamos qué correos existen.
  if (!data || !coincide) return { ok: false, mensaje: "Correo o contraseña incorrectos." };
  return { ok: true, vendedorId: data.id as string };
}

/**
 * Regla 12: el acceso sin registro no comparte datos con nadie. Cada visita
 * recibe su propio libro vacío, aislado del de todos los demás.
 */
export async function crearInvitado(): Promise<Resultado> {
  const { data, error } = await db().from("vendedores").insert({
    es_invitado: true,
    nombre: "Invitado",
  }).select("id").single();

  if (error || !data) {
    console.error("invitado: no se pudo crear el libro de prueba", error);
    return { ok: false, mensaje: "No pudimos abrir el libro de prueba. Prueba de nuevo." };
  }
  return { ok: true, vendedorId: data.id as string };
}

/**
 * Borra un libro de prueba. Al invitado se le dice que su libro "se pierde al
 * cerrar la sesión", y antes eso era verdad solo a medias: perdía el acceso,
 * pero sus movimientos y lo que dijo quedaban en la base para siempre.
 *
 * Filtra por id **y** por `es_invitado`: aunque alguien llegara acá con el id
 * de una cuenta real, esta función no la toca.
 */
export async function borrarInvitado(vendedorId: string): Promise<boolean> {
  const cliente = db();
  const { data } = await cliente.from("vendedores").select("id")
    .eq("id", vendedorId).eq("es_invitado", true).maybeSingle();
  if (!data) return false;

  // Primero lo que cuelga del vendedor: las claves foráneas no borran en cascada.
  const movimientos = await cliente.from("movimientos").delete().eq("vendedor_id", vendedorId);
  const resumenes = await cliente.from("resumen_diario").delete().eq("vendedor_id", vendedorId);
  const vendedor = await cliente.from("vendedores").delete().eq("id", vendedorId).eq("es_invitado", true);
  const error = movimientos.error ?? resumenes.error ?? vendedor.error;
  if (error) {
    console.error("salir: no se pudo borrar el libro de prueba", error);
    return false;
  }
  return true;
}
