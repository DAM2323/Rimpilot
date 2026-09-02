import type { FastifyPluginAsync } from "fastify";
import websocket from "@fastify/websocket";
import type { RawData } from "ws";
import { VoiceAgentBridge } from "../agent/voiceAgent.js";
import { verificarStreamToken } from "../agent/streamToken.js";
import { consultarResumen } from "../services/libroContable.js";

/** Tope de sesiones simultáneas de AssemblyAI: la clave es compartida y se paga por uso. */
const MAX_LLAMADAS = Math.max(1, Number(process.env.MAX_LLAMADAS_CONCURRENTES ?? 5));
let llamadasActivas = 0;

type TwilioStart = { event: "start"; start: { streamSid: string; callSid?: string; customParameters?: Record<string, string> } };
type TwilioMedia = { event: "media"; streamSid: string; media: { payload: string } };
type TwilioStop = { event: "stop"; streamSid: string };
type TwilioEvent = TwilioStart | TwilioMedia | TwilioStop;

function parseTwilioEvent(raw: string): TwilioEvent | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && "event" in parsed && (parsed.event === "start" || parsed.event === "media" || parsed.event === "stop")) return parsed as TwilioEvent;
  } catch { /* ignore malformed frames */ }
  return null;
}

export const streamRoutes: FastifyPluginAsync = async (app) => {
  await app.register(websocket);
  app.get("/stream", { websocket: true }, (socket, request) => {
    let streamSid = "";
    let agent: VoiceAgentBridge | null = null;
    let vendedorId = "";
    let callSid = "";

    const send = (payload: Record<string, unknown>): void => {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload));
    };
    let cupoTomado = false;
    const close = (): void => {
      agent?.close();
      agent = null;
      if (cupoTomado) {
        cupoTomado = false;
        llamadasActivas -= 1;
      }
      if (vendedorId) void consultarResumen(vendedorId).catch((error: unknown) => request.log.error(error, "No se pudo recalcular el resumen"));
    };

    socket.on("message", (raw: RawData) => {
      const event = parseTwilioEvent(raw.toString());
      if (!event) return;
      if (event.event === "start") {
        if (agent) return;
        streamSid = event.start.streamSid;
        callSid = event.start.callSid ?? event.start.customParameters?.callSid ?? "";

        // El vendedor sale del token firmado por /twilio/voice, nunca de un
        // parámetro que el cliente pueda elegir.
        const token = event.start.customParameters?.token ?? "";
        const verificado = token ? verificarStreamToken(token) : null;
        if (!verificado) {
          request.log.warn({ streamSid }, "Stream rechazado: token ausente, inválido o vencido");
          socket.close();
          return;
        }
        if (llamadasActivas >= MAX_LLAMADAS) {
          request.log.warn({ streamSid, llamadasActivas }, "Stream rechazado: tope de llamadas simultáneas");
          socket.close();
          return;
        }
        vendedorId = verificado;
        llamadasActivas += 1;
        cupoTomado = true;

        agent = new VoiceAgentBridge({ vendedorId, callSid }, {
          onReady: () => request.log.info({ streamSid }, "Wari listo para recibir audio"),
          onAudio: (audio) => send({ event: "media", streamSid, media: { payload: audio } }),
          onBargeIn: () => send({ event: "clear", streamSid }),
          onError: (message) => request.log.error({ streamSid, message }, "Error de Wari"),
        });
      } else if (event.event === "media") {
        agent?.sendAudio(event.media.payload);
      } else if (event.event === "stop") {
        close();
      }
    });
    socket.on("close", close);
    socket.on("error", close);
  });
};
