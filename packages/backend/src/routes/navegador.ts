import { timingSafeEqual } from "node:crypto";
import type { FastifyPluginCallback } from "fastify";
import type { RawData } from "ws";
import { z } from "zod";
import { textoDeFrame } from "../agent/rawData.js";
import { FORMATO_NAVEGADOR, VoiceAgentBridge } from "../agent/voiceAgent.js";
import { crearStreamToken, verificarStreamToken } from "../agent/streamToken.js";
import { sesionesActivas, tomarCupo } from "../agent/cupo.js";
import { consultarResumen } from "../services/libroContable.js";

/**
 * Canal de voz desde el navegador. El vendedor habla por el micrófono de su
 * teléfono o su laptop y el audio viaja por *nuestro* backend hasta AssemblyAI.
 *
 * La API permite que el navegador se conecte directo con un token temporal, y
 * para este proyecto eso sería un retroceso: las llamadas a herramientas
 * volverían al navegador y cualquiera podría pedir que se escriba en el libro de
 * otro vendedor. Es exactamente el IDOR que cerramos en el canal telefónico. Con
 * el puente en el medio, la clave de AssemblyAI no sale del servidor y el
 * `vendedor_id` sale del token firmado, nunca de un mensaje del cliente.
 */
const LARGO_MINIMO_CLAVE = 32;
/** Si el primer mensaje no trae el token, la sesión no llega a abrirse. */
const MS_PARA_AUTENTICAR = 5000;

/** Regla 8: todo lo que manda el navegador pasa por este esquema. */
const mensajeNavegadorSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("iniciar"), token: z.string().min(1).max(512) }),
  z.object({ tipo: z.literal("audio"), audio: z.string().min(1).max(65_536) }),
  z.object({ tipo: z.literal("fin") }),
]);

const tokenBodySchema = z.object({ vendedorId: z.string().uuid() });

function claveInterna(): string | null {
  const valor = process.env.RIMPILOT_INTERNAL_KEY;
  return valor && valor.length >= LARGO_MINIMO_CLAVE ? valor : null;
}

/** Regla 6: el secreto compartido se compara en tiempo constante. */
function claveValida(recibida: unknown, esperada: string): boolean {
  if (typeof recibida !== "string") return false;
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Sin lista configurada solo se aceptan orígenes locales: así el desarrollo
 * funciona recién clonado y ningún sitio remoto entra por omisión.
 */
function origenPermitido(origen: string | undefined): boolean {
  const configurados = (process.env.RIMPILOT_ORIGENES_PERMITIDOS ?? "")
    .split(",").map((valor) => valor.trim()).filter(Boolean);
  if (configurados.length > 0) return origen !== undefined && configurados.includes(origen);
  if (!origen) return false;
  try {
    const { hostname } = new URL(origen);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

export const navegadorRoutes: FastifyPluginCallback = (app, _opciones, listo) => {
  /**
   * El panel (que ya está detrás de Basic Auth) pide el token desde el servidor
   * con la clave interna. El navegador nunca ve la clave ni elige el vendedor.
   */
  app.post("/token", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
  }, async (request, reply) => {
    const esperada = claveInterna();
    if (!esperada) {
      request.log.error("RIMPILOT_INTERNAL_KEY ausente o demasiado corta: el canal del navegador queda cerrado.");
      return reply.code(503).send({ error: "Canal de voz no configurado." });
    }
    if (!claveValida(request.headers["x-rimpilot-clave"], esperada)) {
      return reply.code(403).send({ error: "Clave interna inválida." });
    }
    const datos = tokenBodySchema.safeParse(request.body);
    if (!datos.success) {
      return reply.code(400).send({ error: "Se esperaba un vendedorId con formato UUID." });
    }
    return reply.send({ token: crearStreamToken(datos.data.vendedorId), vigenciaSegundos: 300 });
  });

  app.get("/stream", { websocket: true }, (socket, request) => {
    if (!origenPermitido(request.headers.origin)) {
      request.log.warn({ origen: request.headers.origin }, "Sesión de navegador rechazada: origen no permitido");
      socket.close();
      return;
    }

    let agent: VoiceAgentBridge | null = null;
    let vendedorId = "";
    let liberarCupo: (() => void) | null = null;
    const vistos = new Set<string>();

    const send = (payload: Record<string, unknown>): void => {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload));
    };

    const plazo = setTimeout(() => {
      if (!agent) {
        request.log.warn("Sesión de navegador cerrada: no llegó el token a tiempo");
        socket.close();
      }
    }, MS_PARA_AUTENTICAR);

    const cerrar = (): void => {
      clearTimeout(plazo);
      agent?.close();
      agent = null;
      liberarCupo?.();
      liberarCupo = null;
      if (vendedorId) {
        void consultarResumen(vendedorId).catch((error: unknown) => request.log.error(error, "No se pudo recalcular el resumen"));
      }
    };

    socket.on("message", (raw: RawData) => {
      let bruto: unknown;
      try {
        bruto = JSON.parse(textoDeFrame(raw));
      } catch {
        return;
      }
      const mensaje = mensajeNavegadorSchema.safeParse(bruto);
      if (!mensaje.success) return;

      if (mensaje.data.tipo === "iniciar") {
        if (agent) return;
        const verificado = verificarStreamToken(mensaje.data.token);
        if (!verificado) {
          request.log.warn("Sesión de navegador rechazada: token ausente, inválido o vencido");
          send({ tipo: "error", mensaje: "Sesión vencida. Recargá el panel y volvé a intentar." });
          socket.close();
          return;
        }
        const cupo = tomarCupo();
        if (!cupo) {
          request.log.warn({ activas: sesionesActivas() }, "Sesión de navegador rechazada: tope de sesiones simultáneas");
          send({ tipo: "error", mensaje: "Hay demasiadas sesiones abiertas. Probá en un momento." });
          socket.close();
          return;
        }
        clearTimeout(plazo);
        vendedorId = verificado;
        liberarCupo = cupo;

        agent = new VoiceAgentBridge({ vendedorId, formato: FORMATO_NAVEGADOR }, {
          onReady: () => send({ tipo: "listo" }),
          onAudio: (audio) => send({ tipo: "audio", audio }),
          onBargeIn: () => send({ tipo: "limpiar" }),
          onTranscript: (texto, final) => send({ tipo: "transcripcion", texto, final }),
          // Una línea por tipo de evento y no una por fragmento: `reply.audio`
          // llega cien veces por segundo y ahogaría el resto del log.
          onEvento: (tipo, manejado, evento) => {
            const clave = `${tipo}:${manejado}`;
            if (vistos.has(clave)) return;
            vistos.add(clave);
            // `session.updated` trae la configuración que la API aceptó de
            // verdad: es la única forma de saber si la voz que pedimos quedó.
            if (tipo === "session.updated" || tipo === "session.error") {
              request.log.info({ tipo, evento }, "Configuración aplicada por AssemblyAI");
              return;
            }
            request.log.info({ tipo, manejado }, manejado ? "Evento de AssemblyAI" : "Evento de AssemblyAI que no sabemos manejar");
          },
          onHerramienta: (nombre, argumentos, resultado) =>
            request.log.info({ herramienta: nombre, argumentos, resultado }, "Wari pidió una herramienta"),
          onError: (mensajeError) => {
            request.log.error({ mensaje: mensajeError }, "Error de Wari en el navegador");
            // Antes esto moría en el log del servidor: el vendedor veía el
            // micrófono encendido y nada más, sin saber que algo había fallado.
            send({ tipo: "aviso", mensaje: mensajeError });
          },
          onFatal: (mensajeError) => {
            // Regla 20: mensaje real, nunca un micrófono abierto contra la nada.
            request.log.error({ mensaje: mensajeError }, "Sesión de voz caída: se cierra el canal del navegador");
            send({ tipo: "error", mensaje: "Wari se desconectó. Volvé a intentar en un momento." });
            cerrar();
            socket.close();
          },
        });
      } else if (mensaje.data.tipo === "audio") {
        agent?.sendAudio(mensaje.data.audio);
      } else {
        cerrar();
        socket.close();
      }
    });

    socket.on("close", cerrar);
    socket.on("error", cerrar);
  });

  listo();
};
