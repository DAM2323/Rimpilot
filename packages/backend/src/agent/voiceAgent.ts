import WebSocket from "ws";
import { z } from "zod";
import { WARI_GREETING, WARI_SYSTEM_PROMPT } from "./systemPrompt.js";
import { gastoSchema, resumenSchema, retiroSchema, ventaSchema, herramientas } from "./tools.js";
import { textoDeFrame } from "./rawData.js";
import { registrarMovimiento, resumenParaCierre } from "../services/libroContable.js";

/**
 * Override solo para pruebas o staging. Se comprueba por verdadero, no con `??`:
 * copiar `.env.example` deja la variable vacía y `??` la daría por válida.
 */
const voiceUrl = process.env.ASSEMBLYAI_VOICE_URL || "wss://agents.assemblyai.com/v1/realtime";

type AgentEvent = z.infer<typeof agentEventSchema>;
type ToolContext = { vendedorId: string; callSid?: string; getTranscript: () => string };

/**
 * Cada transporte trae el audio en su propio códec y la sesión se configura con
 * el que corresponda: Twilio habla G.711 μ-law a 8 kHz y el navegador PCM de 16
 * bits a 24 kHz.
 *
 * Solo va `encoding`. La tasa está implícita en cada códec —24 kHz para
 * `audio/pcm`, 8 kHz para `audio/pcmu`— y los ejemplos de la API no llevan
 * ningún otro campo acá. Mandar un `sample_rate` de más no es inofensivo: la
 * sesión se abre igual y transcribe, pero el agente deja de producir voz, así
 * que el síntoma es silencio sin ningún error.
 */
export type FormatoAudio = { encoding: "audio/pcmu" | "audio/pcm" };

export const FORMATO_TELEFONO: FormatoAudio = { encoding: "audio/pcmu" };
export const FORMATO_NAVEGADOR: FormatoAudio = { encoding: "audio/pcm" };

/**
 * El catálogo documentado de voces, copiado tal cual de
 * https://www.assemblyai.com/docs/voice-agents/voice-agent-api/voices
 *
 * Esta lista existe por un error que costó días: pedimos `diego`, un nombre que
 * no está en el catálogo. La API no devuelve ningún error por eso —acepta la
 * sesión, transcribe, usa el prompt y las herramientas— y simplemente vuelve a
 * su voz por defecto, que es inglesa. El síntoma era "la voz sigue siendo de
 * mujer" sin una sola línea en el log que lo explicara.
 *
 * De ahí la regla del propio starter de AssemblyAI: solo IDs del catálogo,
 * nunca inventar uno. Acá se comprueba al arrancar, no en producción.
 */
const VOCES_DOCUMENTADAS = [
  // Acento estadounidense
  "alba", "eve", "george", "jane", "jean", "mary", "michael",
  // Acento británico
  "anna", "charles", "paul", "vera",
  // Acento nativo en su idioma
  "giovanni", "lola", "juergen", "rafael", "estelle",
] as const;

type Voz = (typeof VOCES_DOCUMENTADAS)[number];

/**
 * `lola` es la única voz con acento nativo en español del catálogo. Es de
 * España y RIMPILOT es para Perú, así que el acento no es el del vendedor; aun
 * así es el valor por defecto, porque las alternativas hablan español con
 * acento inglés. Hoy no hay ninguna voz masculina en español.
 *
 * Se puede cambiar con `ASSEMBLYAI_VOZ` en el `.env`, para poder escuchar
 * varias sin tocar el código: cuál suena mejor es algo que se decide oyéndolas,
 * no leyendo una tabla.
 */
const VOZ_POR_DEFECTO: Voz = "lola";

/** Falla al arrancar, no en medio de una llamada que además se paga. */
function vozValida(voz: string): Voz {
  if (!(VOCES_DOCUMENTADAS as readonly string[]).includes(voz)) {
    throw new Error(
      `La voz "${voz}" no está en el catálogo de AssemblyAI. Usá una de: ${VOCES_DOCUMENTADAS.join(", ")}.`,
    );
  }
  return voz as Voz;
}

function vozElegida(): Voz {
  const pedida = process.env.ASSEMBLYAI_VOZ?.trim().toLowerCase();
  return pedida ? vozValida(pedida) : VOZ_POR_DEFECTO;
}

/** Lo que el puente necesita saber de la sesión, sea teléfono o navegador. */
export type ContextoSesion = Omit<ToolContext, "getTranscript"> & { formato: FormatoAudio };

const agentEventSchema = z.object({
  type: z.string(),
  /**
   * El audio del vendedor viaja en `audio`, pero el de Wari llega en `data`.
   * Son campos distintos en cada sentido y confundirlos no da ningún error:
   * los fragmentos entran y se descartan en silencio.
   */
  audio: z.string().optional(),
  data: z.string().optional(),
  /** `session.updated` devuelve la configuración tal como quedó aplicada. */
  session: z.unknown().optional(),
  text: z.string().optional(),
  message: z.string().optional(),
  session_id: z.string().optional(),
  call_id: z.string().optional(),
  name: z.string().optional(),
  args: z.unknown().optional(),
  arguments: z.unknown().optional(),
}).passthrough();

function parseEvent(raw: WebSocket.RawData): AgentEvent | null {
  let bruto: unknown;
  try {
    bruto = JSON.parse(textoDeFrame(raw));
  } catch {
    return null;
  }
  const result = agentEventSchema.safeParse(bruto);
  return result.success ? result.data : null;
}

/** Reintentos ante saturación de AssemblyAI antes de cortar la llamada. */
const MAX_REINTENTOS = 2;
const ESTADOS_RECUPERABLES = new Set([429, 500, 502, 503, 504]);

export class VoiceAgentBridge {
  private socket!: WebSocket;
  private ready = false;
  private latestTranscript = "";
  private pendingAudio: string[] = [];
  private intentos = 0;
  private reconectando = false;
  private cerradoPorNosotros = false;

  constructor(
    private readonly context: ContextoSesion,
    private readonly handlers: {
      onReady: () => void;
      onAudio: (audio: string) => void;
      onBargeIn: () => void;
      /**
       * Lo que Wari entendió. El teléfono no lo usa; el navegador sí, porque ahí
       * el vendedor (y el jurado) necesita ver en pantalla que fue escuchado.
       */
      onTranscript?: (texto: string, final: boolean) => void;
      /**
       * Lo que Wari dijo. Sin esto, cuando algo sale raro el log muestra que
       * hubo respuesta y cuántos fragmentos de voz tuvo, pero no qué dijo, que
       * es justo lo que hace falta para entender por qué no anotó nada.
       */
      onTranscripcionDeWari?: (texto: string) => void;
      /**
       * Cada evento que llega de AssemblyAI, con si lo entendimos o no. Los
       * nombres de los eventos son de la API, no nuestros: si alguno cambia o
       * nos equivocamos, sin esto el síntoma es silencio y nada en el log.
       */
      onEvento?: (tipo: string, manejado: boolean, evento: Record<string, unknown>) => void;
      /**
       * Cada herramienta que Wari pide, con lo que devolvió. Wari puede decir
       * que anotó algo sin haberlo pedido nunca, así que la palabra del modelo
       * no alcanza: esto deja constancia de lo que pasó de verdad.
       */
      onHerramienta?: (nombre: string, argumentos: unknown, resultado: Record<string, unknown>) => void;
      onError: (message: string) => void;
      /** La sesión no se puede sostener: hay que cortar la llamada, no dejar al vendedor en silencio. */
      onFatal: (message: string) => void;
    },
  ) {
    const key = process.env.ASSEMBLYAI_API_KEY;
    if (!key) throw new Error("ASSEMBLYAI_API_KEY es obligatoria.");
    this.conectar(key);
  }

  private conectar(key: string): void {
    this.ready = false;
    this.reconectando = false;
    this.socket = new WebSocket(voiceUrl, { headers: { Authorization: `Bearer ${key}` } });
    this.socket.on("open", () => this.configure());
    this.socket.on("message", (data) => this.handleEvent(data));
    this.socket.on("unexpected-response", (_peticion, respuesta) => this.manejarRechazo(key, respuesta.statusCode ?? 0));
    this.socket.on("error", (error) => {
      if (!this.cerradoPorNosotros && !this.reconectando) this.handlers.onError(error.message);
    });
    this.socket.on("close", () => {
      if (this.cerradoPorNosotros || this.reconectando) return;
      this.handlers.onFatal("AssemblyAI cerró la sesión de voz.");
    });
  }

  /**
   * Regla 20 traducida a esta API: no hay "modelo más liviano" al que caer, así
   * que ante saturación se reintenta con espera creciente y, si no cede, se
   * corta con un error real en lugar de dejar la llamada muda.
   */
  private manejarRechazo(key: string, estado: number): void {
    const recuperable = ESTADOS_RECUPERABLES.has(estado);
    if (recuperable && this.intentos < MAX_REINTENTOS) {
      this.intentos += 1;
      const espera = 500 * this.intentos;
      this.reconectando = true;
      this.handlers.onError(`AssemblyAI respondió HTTP ${estado}; reintento ${this.intentos} de ${MAX_REINTENTOS} en ${espera} ms.`);
      setTimeout(() => {
        if (!this.cerradoPorNosotros) this.conectar(key);
      }, espera);
      return;
    }
    this.handlers.onFatal(recuperable
      ? `AssemblyAI sigue saturada (HTTP ${estado}) después de ${this.intentos} reintentos.`
      : `AssemblyAI rechazó la sesión con HTTP ${estado}.`);
  }

  sendAudio(audio: string): void {
    if (this.ready && this.socket.readyState === WebSocket.OPEN) {
      this.send({ type: "input.audio", audio });
    } else if (this.pendingAudio.length < 100) {
      this.pendingAudio.push(audio);
    }
  }

  close(): void {
    this.cerradoPorNosotros = true;
    if (this.socket.readyState === WebSocket.OPEN) this.send({ type: "session.end" });
    this.socket.close();
  }

  private configure(): void {
    this.send({
      type: "session.update",
      session: {
        system_prompt: WARI_SYSTEM_PROMPT,
        greeting: WARI_GREETING,
        tools: herramientas,
        // `type: "audio"` va en los dos: sin él la API ignora el bloque y
        // vuelve a su voz por defecto, que es inglesa y femenina.
        input: {
          type: "audio",
          format: this.context.formato,
          language_codes: ["es"],
          keyterms: ["Yape", "Plin", "retiro", "caja", "RIMPILOT"],
          turn_detection: { min_silence: 800, max_silence: 2200, interrupt_response: true },
        },
        output: { type: "audio", voice: vozElegida(), format: this.context.formato },
      },
    });
  }

  private handleEvent(raw: WebSocket.RawData): void {
    const event = parseEvent(raw);
    if (!event) return;
    if (event.type === "session.ready") {
      this.ready = true;
      for (const audio of this.pendingAudio.splice(0)) this.send({ type: "input.audio", audio });
      this.handlers.onReady();
    } else if (event.type === "reply.audio" && event.data) {
      this.handlers.onAudio(event.data);
    } else if (event.type === "input.speech.started") {
      this.latestTranscript = "";
      this.handlers.onBargeIn();
    } else if (event.type === "transcript.user.delta" && event.text) {
      this.latestTranscript = event.text.startsWith(this.latestTranscript)
        ? event.text
        : `${this.latestTranscript}${this.latestTranscript && !this.latestTranscript.endsWith(" ") ? " " : ""}${event.text}`;
      this.handlers.onTranscript?.(this.latestTranscript, false);
    } else if (event.type === "transcript.user" && event.text) {
      this.latestTranscript = event.text;
      this.handlers.onTranscript?.(this.latestTranscript, true);
    } else if (event.type === "transcript.agent" && event.text) {
      this.handlers.onTranscripcionDeWari?.(event.text);
    } else if (event.type === "reply.started" || event.type === "input.speech.stopped"
      || event.type === "transcript.agent.delta") {
      // Eventos normales del protocolo que no exigen nada de nuestra parte. Se
      // marcan como conocidos igual: un log que los llama "no sabemos manejar"
      // manda a buscar el problema donde no está.
      this.handlers.onEvento?.(event.type, true, event);
      return;
    } else if (event.type === "tool.call") {
      // Se ejecuta ya, no al cerrar el turno: el agente se queda esperando el
      // resultado antes de volver a hablar, así que aguardar un `reply.done`
      // que no va a llegar deja la conversación muda para siempre.
      void this.responderHerramienta(event);
    } else if (event.type === "reply.done") {
      this.handlers.onEvento?.(event.type, true, event);
      return;
    } else if (event.type === "session.error") {
      this.handlers.onError(event.message ?? event.text ?? "AssemblyAI devolvió un error de sesión.");
    } else if (event.type === "error") {
      this.handlers.onError(event.message ?? event.text ?? "AssemblyAI devolvió un error.");
    } else {
      this.handlers.onEvento?.(event.type, false, event);
      return;
    }
    this.handlers.onEvento?.(event.type, true, event);
  }

  /** Los argumentos llegan en `args`, ya sea como objeto o como JSON en texto. */
  private static argumentos(call: AgentEvent): unknown {
    const crudos = call.args ?? call.arguments;
    if (typeof crudos !== "string") return crudos ?? {};
    try {
      return JSON.parse(crudos);
    } catch {
      return {};
    }
  }

  private async responderHerramienta(call: AgentEvent): Promise<void> {
    if (!call.call_id || !call.name) return;
    const argumentos = VoiceAgentBridge.argumentos(call);
    try {
      const result = await this.executeTool(call.name, argumentos);
      this.handlers.onHerramienta?.(call.name, argumentos, result);
      this.send({ type: "tool.result", call_id: call.call_id, result: JSON.stringify(result), is_error: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo registrar el movimiento.";
      this.handlers.onHerramienta?.(call.name, argumentos, { ok: false, message });
      this.send({ type: "tool.result", call_id: call.call_id, result: JSON.stringify({ ok: false, message }), is_error: true });
    }
  }

  private async executeTool(name: string, rawArguments: unknown): Promise<Record<string, unknown>> {
    const transcripcion = this.latestTranscript;
    if (name === "registrar_venta") {
      const args = ventaSchema.parse(rawArguments);
      const result = await registrarMovimiento(this.context.vendedorId, {
        tipo: "venta", descripcion: args.descripcion ?? "Venta", monto: args.monto, contraparte: args.contraparte,
        metodoPago: args.metodo_pago, callSid: this.context.callSid, transcripcion: args.transcripcion ?? transcripcion,
      });
      return { ok: true, movimientoId: result.id };
    }
    if (name === "registrar_gasto") {
      const args = gastoSchema.parse(rawArguments);
      const result = await registrarMovimiento(this.context.vendedorId, {
        tipo: "gasto", descripcion: args.descripcion ?? "Gasto", monto: args.monto, metodoPago: args.metodo_pago, callSid: this.context.callSid, transcripcion: args.transcripcion ?? transcripcion,
      });
      return { ok: true, movimientoId: result.id };
    }
    if (name === "registrar_retiro") {
      const args = retiroSchema.parse(rawArguments);
      const result = await registrarMovimiento(this.context.vendedorId, {
        // Un retiro no tiene contraparte: la plata se la lleva el propio vendedor.
        tipo: "retiro", descripcion: args.motivo?.trim() || "Retiro personal", monto: args.monto,
        metodoPago: args.metodo_pago ?? "efectivo", callSid: this.context.callSid, transcripcion: args.transcripcion ?? transcripcion,
      });
      return { ok: true, movimientoId: result.id };
    }
    if (name === "consultar_resumen_del_dia") {
      const args = resumenSchema.parse(rawArguments);
      const summary = await resumenParaCierre(this.context.vendedorId, args.fecha);
      return { ok: true, ...summary };
    }
    throw new Error(`Herramienta desconocida: ${name}`);
  }

  private send(payload: Record<string, unknown>): void {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(payload));
  }
}
