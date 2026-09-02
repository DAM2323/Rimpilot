import type { FastifyPluginAsync } from "fastify";
import websocket from "@fastify/websocket";
import type { RawData } from "ws";
import { z } from "zod";
import { textoDeFrame } from "../agent/rawData.js";
import { VoiceAgentBridge } from "../agent/voiceAgent.js";
import { verificarStreamToken } from "../agent/streamToken.js";
import { consultarResumen } from "../services/libroContable.js";

/** Tope de sesiones simultáneas de AssemblyAI: la clave es compartida y se paga por uso. */
const MAX_LLAMADAS = Math.max(1, Number(process.env.MAX_LLAMADAS_CONCURRENTES) || 5);
let llamadasActivas = 0;

/** Nada del stream llega a la base sin pasar por este esquema (regla 8). */
const twilioEventSchema = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("start"),
    start: z.object({
      streamSid: z.string().min(1),
      callSid: z.string().optional(),
      customParameters: z.record(z.string()).optional(),
    }),
  }),
  z.object({
    event: z.literal("media"),
    media: z.object({ payload: z.string().min(1) }),
  }),
  z.object({ event: z.literal("stop") }),
]);

type TwilioEvent = z.infer<typeof twilioEventSchema>;

function parseTwilioEvent(raw: string): TwilioEvent | null {
  let bruto: unknown;
  try {
    bruto = JSON.parse(raw);
  } catch {
    return null;
  }
  const resultado = twilioEventSchema.safeParse(bruto);
  return resultado.success ? resultado.data : null;
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
      const event = parseTwilioEvent(textoDeFrame(raw));
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
          onFatal: (message) => {
            // Regla 20: error real y llamada cortada, nunca silencio indefinido.
            request.log.error({ streamSid, message }, "Sesión de voz caída: se corta la llamada");
            close();
            socket.close();
          },
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
