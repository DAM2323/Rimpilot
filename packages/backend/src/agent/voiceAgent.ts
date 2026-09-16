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

/** Lo que el puente necesita saber de la sesión, sea teléfono o navegador. */
export type ContextoSesion = Omit<ToolContext, "getTranscript"> & { formato: FormatoAudio };

const agentEventSchema = z.object({
  type: z.string(),
  audio: z.string().optional(),
  text: z.string().optional(),
  message: z.string().optional(),
  session_id: z.string().optional(),
  call_id: z.string().optional(),
  name: z.string().optional(),
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
  private pendingToolCalls: AgentEvent[] = [];
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
       * Cada evento que llega de AssemblyAI, con si lo entendimos o no. Los
       * nombres de los eventos son de la API, no nuestros: si alguno cambia o
       * nos equivocamos, sin esto el síntoma es silencio y nada en el log.
       */
      onEvento?: (tipo: string, manejado: boolean) => void;
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
        input: {
          format: this.context.formato,
          language_codes: ["es"],
          keyterms: ["Yape", "Plin", "retiro", "caja", "RIMPILOT"],
          turn_detection: { min_silence: 800, max_silence: 2200, interrupt_response: true },
        },
        output: { voice: "diego", format: this.context.formato },
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
    } else if (event.type === "reply.audio" && event.audio) {
      this.handlers.onAudio(event.audio);
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
    } else if (event.type === "tool.call") {
      this.pendingToolCalls.push(event);
    } else if (event.type === "reply.done") {
      void this.respondToPendingTools();
    } else if (event.type === "session.error") {
      this.handlers.onError(event.message ?? event.text ?? "AssemblyAI devolvió un error de sesión.");
    } else if (event.type === "error") {
      this.handlers.onError(event.message ?? event.text ?? "AssemblyAI devolvió un error.");
    } else {
      this.handlers.onEvento?.(event.type, false);
      return;
    }
    this.handlers.onEvento?.(event.type, true);
  }

  private async respondToPendingTools(): Promise<void> {
    const calls = this.pendingToolCalls.splice(0);
    for (const call of calls) {
      if (!call.call_id || !call.name) continue;
      try {
        const result = await this.executeTool(call.name, call.arguments ?? {});
        this.send({ type: "tool.result", call_id: call.call_id, result: JSON.stringify(result) });
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo registrar el movimiento.";
        this.send({ type: "tool.result", call_id: call.call_id, result: JSON.stringify({ ok: false, message }) });
      }
    }
  }

  private async executeTool(name: string, rawArguments: unknown): Promise<Record<string, unknown>> {
    const transcripcion = this.latestTranscript;
    if (name === "registrar_venta") {
      const args = ventaSchema.parse(rawArguments);
      const result = await registrarMovimiento(this.context.vendedorId, {
        tipo: "venta", descripcion: args.descripcion, monto: args.monto, contraparte: args.contraparte,
        metodoPago: args.metodo_pago, callSid: this.context.callSid, transcripcion: args.transcripcion ?? transcripcion,
      });
      return { ok: true, movimientoId: result.id };
    }
    if (name === "registrar_gasto") {
      const args = gastoSchema.parse(rawArguments);
      const result = await registrarMovimiento(this.context.vendedorId, {
        tipo: "gasto", descripcion: args.descripcion, monto: args.monto, metodoPago: args.metodo_pago, callSid: this.context.callSid, transcripcion: args.transcripcion ?? transcripcion,
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
