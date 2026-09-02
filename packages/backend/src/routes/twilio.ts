import type { FastifyPluginAsync } from "fastify";
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

export const twilioRoutes: FastifyPluginAsync = async (app) => {
  app.post("/voice", async (request, reply) => {
    const body = request.body as { From?: string; CallSid?: string };
    const phone = body.From ?? "unknown";
    const callSid = body.CallSid ?? "";
    const vendedor = await obtenerOCrearVendedor(phone);
    const streamUrl = mediaStreamUrl();
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="${escapeXml(streamUrl)}"><Parameter name="vendedorId" value="${escapeXml(vendedor.id)}"/><Parameter name="caller" value="${escapeXml(phone)}"/><Parameter name="callSid" value="${escapeXml(callSid)}"/></Stream></Connect></Response>`;
    return reply.type("text/xml").send(twiml);
  });
};
