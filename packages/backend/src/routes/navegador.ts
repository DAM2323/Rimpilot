import { timingSafeEqual } from "node:crypto";
import type { FastifyPluginCallback } from "fastify";
import type { RawData } from "ws";
import { z } from "zod";
import { textoDeFrame } from "../agent/rawData.js";
import { FORMATO_NAVEGADOR, VoiceAgentBridge } from "../agent/voiceAgent.js";
import { crearStreamToken, verificarStreamToken } from "../agent/streamToken.js";
import type { Idioma } from "../agent/systemPrompt.js";
import { sesionesActivas, tomarCupo, type Rechazo } from "../agent/cupo.js";
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

/**
 * Regla 8: todo lo que manda el navegador pasa por este esquema.
 *
 * `idioma` viaja sin firmar a propósito: solo decide en qué idioma habla Wari,
 * no de quién es el libro ni cuánto se gasta. Lo que no sea `es` o `en` se
 * rechaza igual, y si falta la sesión es en español.
 */
const mensajeNavegadorSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("iniciar"), token: z.string().min(1).max(512), idioma: z.enum(["es", "en"]).optional() }),
  z.object({ tipo: z.literal("audio"), audio: z.string().min(1).max(65_536) }),
  z.object({ tipo: z.literal("fin") }),
]);

const tokenBodySchema = z.object({ vendedorId: z.string().uuid() });

/** Lo que ve la persona en el panel, en su idioma. Ningún rechazo es un error suyo. */
const MENSAJES: Record<Idioma, {
  rechazo: Record<Rechazo, string>;
  vencida: string;
  limite: (minutos: string) => string;
  desconectado: string;
}> = {
  es: {
    rechazo: {
      simultaneas: "Hay demasiadas conversaciones abiertas ahora. Prueba en un momento.",
      diaria_vendedor: "Ya hablaste mucho hoy. Mañana puedes seguir.",
      diaria_total: "RIMPILOT atendió todo lo que podía por hoy. Prueba mañana.",
    },
    vencida: "Sesión vencida. Recarga la página y vuelve a intentarlo.",
    limite: (mensaje) => `${mensaje} Toca Empezar a hablar para seguir.`,
    desconectado: "Se cortó la voz. Vuelve a intentarlo en un momento.",
  },
  en: {
    rechazo: {
      simultaneas: "There are too many conversations open right now. Try again in a moment.",
      diaria_vendedor: "You've talked a lot today. You can continue tomorrow.",
      diaria_total: "RIMPILOT has handled all it can for today. Try again tomorrow.",
    },
    vencida: "Session expired. Reload the page and try again.",
    limite: () => "The session reached its time limit. Tap Start talking to continue.",
    desconectado: "The voice disconnected. Try again in a moment.",
  },
};

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
   * El panel pide el token desde el servidor, con la clave interna y el
   * vendedor de la sesión ya verificada. El navegador nunca ve la clave ni
   * elige de quién es el libro.
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
    /** Cuántos fragmentos de voz lleva la respuesta que Wari está diciendo. */
    let fragmentosDeVoz = 0;

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
        const idioma: Idioma = mensaje.data.idioma ?? "es";
        const textos = MENSAJES[idioma];
        const verificado = verificarStreamToken(mensaje.data.token);
        if (!verificado) {
          request.log.warn("Sesión de navegador rechazada: token ausente, inválido o vencido");
          send({ tipo: "error", mensaje: textos.vencida });
          socket.close();
          return;
        }
        const cupo = tomarCupo(verificado);
        if ("rechazo" in cupo) {
          request.log.warn({ rechazo: cupo.rechazo, activas: sesionesActivas() }, "Sesión de navegador rechazada por tope");
          send({ tipo: "error", mensaje: textos.rechazo[cupo.rechazo] });
          socket.close();
          return;
        }
        clearTimeout(plazo);
        vendedorId = verificado;
        liberarCupo = cupo.liberar;
        request.log.info({ idioma }, "Sesión de voz del navegador abierta");

        agent = new VoiceAgentBridge({ vendedorId, formato: FORMATO_NAVEGADOR, idioma }, {
          onReady: () => send({ tipo: "listo" }),
          onAudio: (audio) => send({ tipo: "audio", audio }),
          onBargeIn: () => send({ tipo: "limpiar" }),
          onTranscript: (texto, final) => send({ tipo: "transcripcion", texto, final }),
          onEstado: (estado) => send({ tipo: "estado", estado }),
          onTranscripcionDeWari: (texto) => {
            // Queda en el log y además se muestra: en una demo, ver la
            // conversación escrita es la mitad de lo que hay que mostrar.
            request.log.info({ wari: texto }, "Wari dijo");
            send({ tipo: "wari", texto });
          },
          /**
           * Cada evento, en orden, salvo `reply.audio`, que llega cien veces por
           * segundo y ahogaría todo lo demás: de ese se registra solo el primero
           * de cada respuesta.
           *
           * Antes se guardaba una sola línea por tipo de evento. Parecía
           * prolijo y fue un estorbo: cuando Wari se quedaba mudo a mitad de una
           * conversación, los eventos del segundo turno ya no se imprimían
           * porque su tipo "ya se había visto", y el log terminaba justo donde
           * empezaba el problema.
           */
          onEvento: (tipo, manejado, evento) => {
            if (tipo === "reply.audio") {
              if (fragmentosDeVoz > 0) { fragmentosDeVoz += 1; return; }
              fragmentosDeVoz = 1;
            } else if (tipo === "reply.done") {
              request.log.info({ tipo, fragmentosDeVoz }, "Wari terminó de hablar");
              fragmentosDeVoz = 0;
              return;
            }
            // `session.updated` trae la configuración que la API aceptó de
            // verdad: es la única forma de saber si la voz que pedimos quedó.
            if (tipo === "session.updated" || tipo === "session.error") {
              request.log.info({ tipo, evento }, "Configuración aplicada por AssemblyAI");
              return;
            }
            request.log.info({ tipo, manejado }, manejado ? "Evento de AssemblyAI" : "Evento de AssemblyAI que no sabemos manejar");
          },
          onHerramienta: (nombre, argumentos, resultado) => {
            request.log.info({ herramienta: nombre, argumentos, resultado }, "Wari pidió una herramienta");
            // El libro se refresca solo cada 5 s; con este aviso la fila nueva
            // aparece en el momento en que queda escrita, no hasta 5 s después.
            if (resultado.ok === true && nombre.startsWith("registrar_")) send({ tipo: "anotado" });
          },
          onError: (mensajeError) => {
            request.log.error({ mensaje: mensajeError }, "Error de Wari en el navegador");
            // Antes esto moría en el log del servidor: el vendedor veía el
            // micrófono encendido y nada más, sin saber que algo había fallado.
            send({ tipo: "aviso", mensaje: mensajeError });
          },
          onLimite: (mensajeLimite) => {
            request.log.info({ mensaje: mensajeLimite }, "Sesión de voz cerrada por duración máxima");
            send({ tipo: "error", mensaje: textos.limite(mensajeLimite) });
            cerrar();
            socket.close();
          },
          onFatal: (mensajeError) => {
            // Regla 20: mensaje real, nunca un micrófono abierto contra la nada.
            request.log.error({ mensaje: mensajeError }, "Sesión de voz caída: se cierra el canal del navegador");
            send({ tipo: "error", mensaje: textos.desconectado });
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
