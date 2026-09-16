import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Twilio no firma los frames del Media Stream, así que el WebSocket no puede
 * confiar en lo que le llega por `customParameters`. El webhook de voz —que sí
 * viene firmado— emite este token y el stream deriva de él el vendedor. Nadie
 * puede escribir en un libro ajeno cambiando un parámetro.
 */
const VIGENCIA_SEGUNDOS = 300;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function secreto(): string {
  const valor = process.env.STREAM_TOKEN_SECRET;
  if (!valor || valor.length < 32) {
    throw new Error("STREAM_TOKEN_SECRET es obligatoria y debe tener al menos 32 caracteres.");
  }
  return valor;
}

function firmar(payload: string): string {
  return createHmac("sha256", secreto()).update(payload).digest("base64url");
}

export function crearStreamToken(vendedorId: string, ahora = Date.now()): string {
  const payload = `${vendedorId}.${Math.floor(ahora / 1000) + VIGENCIA_SEGUNDOS}`;
  return `${payload}.${firmar(payload)}`;
}

/** Devuelve el vendedorId solo si la firma es válida y el token no expiró. */
export function verificarStreamToken(token: string, ahora = Date.now()): string | null {
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [vendedorId, expira, firma] = partes;

  const esperada = Buffer.from(firmar(`${vendedorId}.${expira}`));
  const recibida = Buffer.from(firma);
  if (recibida.length !== esperada.length) return null;
  if (!timingSafeEqual(recibida, esperada)) return null;

  const vence = Number(expira);
  if (!Number.isFinite(vence) || vence * 1000 <= ahora) return null;
  if (!UUID.test(vendedorId)) return null;
  return vendedorId;
}
