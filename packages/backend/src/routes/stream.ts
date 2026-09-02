import type { FastifyPluginAsync } from "fastify";
import websocket from "@fastify/websocket";
import type { RawData } from "ws";
import { VoiceAgentBridge } from "../agent/voiceAgent.js";
import { consultarResumen } from "../services/libroContable.js";

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
    const close = (): void => {
      agent?.close();
      if (vendedorId) void consultarResumen(vendedorId).catch((error: unknown) => request.log.error(error, "No se pudo recalcular el resumen"));
    };

    socket.on("message", (raw: RawData) => {
      const event = parseTwilioEvent(raw.toString());
      if (!event) return;
      if (event.event === "start") {
        streamSid = event.start.streamSid;
        vendedorId = event.start.customParameters?.vendedorId ?? "";
        callSid = event.start.callSid ?? event.start.customParameters?.callSid ?? "";
        if (!vendedorId) {
          request.log.error("Twilio no envió vendedorId");
          socket.close();
          return;
        }
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
