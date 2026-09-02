import type { FastifyPluginAsync } from "fastify";
import rateLimit from "@fastify/rate-limit";
import twilio from "twilio";
import { z } from "zod";
import { crearStreamToken } from "../agent/streamToken.js";
import { obtenerOCrearVendedor } from "../services/libroContable.js";

/** Regla 8: el cuerpo del webhook se valida antes de tocar la base. */
const voiceBodySchema = z.object({
  From: z.string().trim().min(1).max(32).regex(/^\+?[0-9()\-.\s]+$/, "Número de origen con formato inesperado"),
  CallSid: z.string().trim().max(64).optional(),
}).passthrough();

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" })[character] ?? character);
}

function mediaStreamUrl(): string {
  const publicUrl = process.env.PUBLIC_URL;
  if (!publicUrl) throw new Error("PUBLIC_URL es obligatoria para construir la URL del Media Stream.");
  const url = new URL(publicUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/twilio/stream";
  return url.toString();
}

function requestUrl(path: string): string {
  const publicUrl = process.env.PUBLIC_URL;
  if (!publicUrl) throw new Error("PUBLIC_URL es obligatoria para validar el webhook de Twilio.");
  return new URL(path, publicUrl).toString();
}

function isSignedTwilioRequest(headers: Record<string, string | string[] | undefined>, body: Record<string, string | undefined>, path: string): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  const signature = headers["x-twilio-signature"];
  if (!token || typeof signature !== "string") return false;
  return twilio.validateRequest(token, signature, requestUrl(path), body);
}

export const twilioRoutes: FastifyPluginAsync = async (app) => {
  // Cada llamada abre una sesión facturable de AssemblyAI, así que el webhook
  // se limita aunque venga firmado. El almacén en memoria alcanza porque el
  // backend es un proceso Fastify de larga vida; en serverless no serviría.
  await app.register(rateLimit, { max: 20, timeWindow: "1 minute", cache: 5000 });

  app.post("/voice", async (request, reply) => {
    const body = request.body as Record<string, string | undefined>;
    if (!isSignedTwilioRequest(request.headers, body, request.raw.url ?? "/twilio/voice")) {
      return reply.code(403).send({ error: "Firma de Twilio inválida." });
    }
    const datos = voiceBodySchema.safeParse(body);
    if (!datos.success) {
      return reply.code(400).send({ error: "Cuerpo del webhook inválido." });
    }
    const phone = datos.data.From;
    const callSid = datos.data.CallSid ?? "";
    const vendedor = await obtenerOCrearVendedor(phone);
    const streamUrl = mediaStreamUrl();
    const token = crearStreamToken(vendedor.id);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="${escapeXml(streamUrl)}"><Parameter name="token" value="${escapeXml(token)}"/><Parameter name="callSid" value="${escapeXml(callSid)}"/></Stream></Connect></Response>`;
    return reply.type("text/xml").send(twiml);
  });
};
