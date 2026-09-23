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
  if (existente) return { ok: false, mensaje: "Ya hay una cuenta con ese correo. Probá entrando." };

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
    return { ok: false, mensaje: "No pudimos crear la cuenta. Probá de nuevo." };
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
    return { ok: false, mensaje: "No pudimos abrir el libro de prueba. Probá de nuevo." };
  }
  return { ok: true, vendedorId: data.id as string };
}
