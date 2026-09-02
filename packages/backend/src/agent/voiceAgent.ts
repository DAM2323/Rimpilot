import WebSocket from "ws";
import { z } from "zod";
import { WARI_GREETING, WARI_SYSTEM_PROMPT } from "./systemPrompt.js";
import { cobrarSchema, gastoSchema, resumenSchema, ventaSchema, herramientas } from "./tools.js";
import { consultarResumen, registrarMovimiento, type MetodoPago } from "../services/libroContable.js";

const voiceUrl = "wss://agents.assemblyai.com/v1/realtime";

type AgentEvent = { type: string; audio?: string; text?: string; message?: string; session_id?: string; call_id?: string; name?: string; arguments?: unknown };
type ToolContext = { vendedorId: string; callSid?: string; getTranscript: () => string };

function parseEvent(raw: WebSocket.RawData): AgentEvent | null {
  try {
    const parsed: unknown = JSON.parse(raw.toString());
    return z.object({ type: z.string() }).passthrough().parse(parsed) as AgentEvent;
  } catch {
    return null;
  }
}

export class VoiceAgentBridge {
  private readonly socket: WebSocket;
  private ready = false;
  private latestTranscript = "";
  private pendingToolCalls: AgentEvent[] = [];
  private pendingAudio: string[] = [];

  constructor(
    private readonly context: Omit<ToolContext, "getTranscript">,
    private readonly handlers: {
      onReady: () => void;
      onAudio: (audio: string) => void;
      onBargeIn: () => void;
      onError: (message: string) => void;
    },
  ) {
    const key = process.env.ASSEMBLYAI_API_KEY;
    if (!key) throw new Error("ASSEMBLYAI_API_KEY es obligatoria.");
    this.socket = new WebSocket(voiceUrl, { headers: { Authorization: `Bearer ${key}` } });
    this.socket.on("open", () => this.configure());
    this.socket.on("message", (data) => this.handleEvent(data));
    this.socket.on("error", (error) => this.handlers.onError(error.message));
  }

  sendAudio(audio: string): void {
    if (this.ready && this.socket.readyState === WebSocket.OPEN) {
      this.send({ type: "input.audio", audio });
    } else if (this.pendingAudio.length < 100) {
      this.pendingAudio.push(audio);
    }
  }

  close(): void {
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
          format: { encoding: "audio/pcmu" },
          language_codes: ["es"],
          keyterms: ["Yape", "Plin", "fiado", "RIMPILOT"],
          turn_detection: { min_silence: 800, max_silence: 2200, interrupt_response: true },
        },
        output: { voice: "alba", format: { encoding: "audio/pcmu" } },
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
      this.handlers.onBargeIn();
    } else if (event.type === "transcript.user.delta" && event.text) {
      this.latestTranscript += event.text;
    } else if (event.type === "transcript.user" && event.text) {
      this.latestTranscript = event.text;
    } else if (event.type === "tool.call") {
      this.pendingToolCalls.push(event);
    } else if (event.type === "reply.done") {
      void this.respondToPendingTools();
    } else if (event.type === "session.error") {
      this.handlers.onError(event.message ?? event.text ?? "AssemblyAI devolvió un error de sesión.");
    }
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
        metodoPago: args.metodo_pago as MetodoPago | undefined, callSid: this.context.callSid, transcripcion: args.transcripcion ?? transcripcion,
      });
      return { ok: true, movimientoId: result.id };
    }
    if (name === "registrar_gasto") {
      const args = gastoSchema.parse(rawArguments);
      const result = await registrarMovimiento(this.context.vendedorId, {
        tipo: "gasto", descripcion: args.descripcion, monto: args.monto, metodoPago: args.metodo_pago as MetodoPago | undefined, callSid: this.context.callSid, transcripcion: args.transcripcion ?? transcripcion,
      });
      return { ok: true, movimientoId: result.id };
    }
    if (name === "registrar_cuenta_por_cobrar") {
      const args = cobrarSchema.parse(rawArguments);
      const result = await registrarMovimiento(this.context.vendedorId, {
        tipo: "cuenta_por_cobrar", descripcion: args.descripcion ?? "Venta al fiado", monto: args.monto,
        contraparte: args.contraparte, metodoPago: "fiado", callSid: this.context.callSid, transcripcion: args.transcripcion ?? transcripcion,
      });
      return { ok: true, movimientoId: result.id };
    }
    if (name === "consultar_resumen_del_dia") {
      const args = resumenSchema.parse(rawArguments);
      const summary = await consultarResumen(this.context.vendedorId, args.fecha);
      return { ok: true, ...summary };
    }
    throw new Error(`Herramienta desconocida: ${name}`);
  }

  private send(payload: Record<string, unknown>): void {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(payload));
  }
}
