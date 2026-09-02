import type { FastifyPluginAsync } from "fastify";
import twilio from "twilio";
import { obtenerOCrearVendedor } from "../services/libroContable.js";

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" })[character] ?? character);
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
  app.post("/voice", async (request, reply) => {
    const body = request.body as Record<string, string | undefined>;
    if (!isSignedTwilioRequest(request.headers, body, request.raw.url ?? "/twilio/voice")) {
      return reply.code(403).send({ error: "Firma de Twilio inválida." });
    }
    const phone = body.From;
    if (!phone) return reply.code(400).send({ error: "Twilio no envió el número de origen." });
    const callSid = body.CallSid ?? "";
    const vendedor = await obtenerOCrearVendedor(phone);
    const streamUrl = mediaStreamUrl();
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="${escapeXml(streamUrl)}"><Parameter name="vendedorId" value="${escapeXml(vendedor.id)}"/><Parameter name="caller" value="${escapeXml(phone)}"/><Parameter name="callSid" value="${escapeXml(callSid)}"/></Stream></Connect></Response>`;
    return reply.type("text/xml").send(twiml);
  });
};
