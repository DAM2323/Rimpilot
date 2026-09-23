"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";

/**
 * Canal de voz por micrófono del navegador.
 *
 * El audio no va del navegador a AssemblyAI: va a nuestro backend, que es el que
 * sostiene la sesión. Así la clave de AssemblyAI no sale del servidor y el libro
 * donde se escribe lo decide un token firmado, no el cliente.
 *
 * Formato acordado con el backend: PCM de 16 bits con signo, little-endian,
 * mono, 24 000 Hz, en base64. El AudioContext se crea a esa misma frecuencia
 * para que no haya remuestreo ni en la captura ni en la reproducción.
 */
const HZ = 24000;
const RUTA_WORKLET = "/captura-microfono.js";
/** Colchón de reproducción: suficiente para que no se corte, corto para que no se sienta lento. */
const COLCHON_SEGUNDOS = 0.08;

type Estado = "inactivo" | "conectando" | "escuchando";

type Sesion = {
  socket: WebSocket;
  contexto: AudioContext;
  pista: MediaStream;
  nodos: AudioNode[];
  fuentes: Set<AudioBufferSourceNode>;
  siguienteInicio: number;
  cerrada: boolean;
};

function aBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // Por trozos y sin `spread`: un bloque de 42 ms entra en la pila, pero pasar
  // decenas de miles de argumentos a `fromCharCode` no siempre.
  const trozos: string[] = [];
  for (let i = 0; i < bytes.length; i += 0x2000) {
    let trozo = "";
    const fin = Math.min(i + 0x2000, bytes.length);
    for (let j = i; j < fin; j += 1) trozo += String.fromCharCode(bytes[j]);
    trozos.push(trozo);
  }
  return btoa(trozos.join(""));
}

function deBase64(valor: string): Int16Array {
  const binario = atob(valor);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return new Int16Array(bytes.buffer, 0, bytes.length >> 1);
}

/** −32768 y +32767 no son simétricos: cada signo se escala con su propio máximo. */
function aInt16(muestra: number): number {
  const acotada = Math.max(-1, Math.min(1, muestra));
  return Math.round(acotada * (acotada < 0 ? 0x8000 : 0x7fff));
}

function aFloat32(muestra: number): number {
  return muestra / (muestra < 0 ? 0x8000 : 0x7fff);
}

export function MicrofonoWari() {
  const [estado, setEstado] = useState<Estado>("inactivo");
  const [transcripcion, setTranscripcion] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [error, setError] = useState("");
  const sesion = useRef<Sesion | null>(null);

  const terminar = useCallback((): void => {
    const activa = sesion.current;
    sesion.current = null;
    setEstado("inactivo");
    if (!activa || activa.cerrada) return;
    activa.cerrada = true;
    activa.fuentes.forEach((fuente) => fuente.stop());
    activa.fuentes.clear();
    for (const nodo of activa.nodos) nodo.disconnect();
    for (const pista of activa.pista.getTracks()) pista.stop();
    if (activa.socket.readyState === WebSocket.OPEN) {
      activa.socket.send(JSON.stringify({ tipo: "fin" }));
    }
    activa.socket.close();
    void activa.contexto.close();
  }, []);

  // Un micrófono abierto y una sesión facturable no pueden sobrevivir a la vista.
  useEffect(() => terminar, [terminar]);

  const reproducir = useCallback((activa: Sesion, pcm: Int16Array): void => {
    // El contexto puede haber quedado suspendido: se crea después de pedir el
    // micrófono y el token, y para entonces la ventana del gesto del usuario
    // ya pasó. Sin esto no suena nada y no hay ningún error que lo diga.
    if (activa.contexto.state === "suspended") void activa.contexto.resume();
    const buffer = activa.contexto.createBuffer(1, pcm.length, HZ);
    const canal = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i += 1) canal[i] = aFloat32(pcm[i]);
    const fuente = activa.contexto.createBufferSource();
    fuente.buffer = buffer;
    fuente.connect(activa.contexto.destination);
    activa.siguienteInicio = Math.max(activa.siguienteInicio, activa.contexto.currentTime + COLCHON_SEGUNDOS);
    fuente.start(activa.siguienteInicio);
    activa.siguienteInicio += buffer.duration;
    activa.fuentes.add(fuente);
    fuente.onended = () => activa.fuentes.delete(fuente);
  }, []);

  /**
   * La captura va por AudioWorklet, que corre fuera del hilo principal. Si el
   * navegador no lo permite se cae a ScriptProcessorNode: está obsoleto, pero es
   * la única vía que funciona en todas partes y un canal mono a 24 kHz no
   * alcanza a trabar el hilo.
   */
  const conectarCaptura = useCallback(async (activa: Sesion, origen: MediaStreamAudioSourceNode): Promise<void> => {
    const enviar = (buffer: ArrayBuffer): void => {
      if (activa.socket.readyState === WebSocket.OPEN) {
        activa.socket.send(JSON.stringify({ tipo: "audio", audio: aBase64(buffer) }));
      }
    };
    // El nodo de captura necesita un destino para que el grafo lo procese; con
    // ganancia en cero el vendedor no se escucha a sí mismo.
    const silencio = activa.contexto.createGain();
    silencio.gain.value = 0;
    silencio.connect(activa.contexto.destination);

    try {
      await activa.contexto.audioWorklet.addModule(RUTA_WORKLET);
      const captura = new AudioWorkletNode(activa.contexto, "captura-microfono");
      captura.port.onmessage = (evento: MessageEvent<ArrayBuffer>) => enviar(evento.data);
      origen.connect(captura);
      captura.connect(silencio);
      activa.nodos.push(origen, captura, silencio);
      return;
    } catch {
      const captura = activa.contexto.createScriptProcessor(4096, 1, 1);
      captura.onaudioprocess = (evento) => {
        const entrada = evento.inputBuffer.getChannelData(0);
        const pcm = new Int16Array(entrada.length);
        for (let i = 0; i < entrada.length; i += 1) pcm[i] = aInt16(entrada[i]);
        enviar(pcm.buffer);
      };
      origen.connect(captura);
      captura.connect(silencio);
      activa.nodos.push(origen, captura, silencio);
    }
  }, []);

  const empezar = useCallback(async (): Promise<void> => {
    setError("");
    setTranscripcion("");
    setRespuesta("");
    setEstado("conectando");

    const wsUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL;
    if (!wsUrl) {
      setError("Falta NEXT_PUBLIC_BACKEND_WS_URL en packages/dashboard/.env.local.");
      setEstado("inactivo");
      return;
    }

    let pista: MediaStream;
    try {
      pista = await navigator.mediaDevices.getUserMedia({
        // La cancelación de eco importa: sin ella el micrófono vuelve a captar
        // la voz de Wari y la sesión se interrumpe a sí misma.
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setError("No pudimos usar el micrófono. Dale permiso al navegador y volvé a intentar.");
      setEstado("inactivo");
      return;
    }

    let token: string;
    try {
      const respuesta = await fetch("/api/voz/token", { method: "POST", cache: "no-store" });
      const datos = (await respuesta.json()) as { token?: string; error?: string };
      if (!respuesta.ok || !datos.token) throw new Error(datos.error ?? "Sesión rechazada.");
      token = datos.token;
    } catch (fallo) {
      for (const canal of pista.getTracks()) canal.stop();
      setError(fallo instanceof Error ? fallo.message : "No pudimos abrir la sesión de voz.");
      setEstado("inactivo");
      return;
    }

    const contexto = new AudioContext({ sampleRate: HZ });
    const socket = new WebSocket(wsUrl);
    const activa: Sesion = { socket, contexto, pista, nodos: [], fuentes: new Set(), siguienteInicio: 0, cerrada: false };
    sesion.current = activa;

    socket.onopen = () => {
      socket.send(JSON.stringify({ tipo: "iniciar", token }));
      void conectarCaptura(activa, contexto.createMediaStreamSource(pista));
    };

    socket.onmessage = (evento: MessageEvent<string>) => {
      let mensaje: { tipo?: string; audio?: string; texto?: string; mensaje?: string };
      try {
        mensaje = JSON.parse(evento.data);
      } catch {
        return;
      }
      if (mensaje.tipo === "listo") {
        setEstado("escuchando");
      } else if (mensaje.tipo === "audio" && mensaje.audio) {
        reproducir(activa, deBase64(mensaje.audio));
      } else if (mensaje.tipo === "limpiar") {
        // Wari fue interrumpido: lo que quedaba por sonar ya no corresponde.
        activa.fuentes.forEach((fuente) => fuente.stop());
        activa.fuentes.clear();
        activa.siguienteInicio = 0;
      } else if (mensaje.tipo === "transcripcion" && typeof mensaje.texto === "string") {
        setTranscripcion(mensaje.texto);
      } else if (mensaje.tipo === "wari" && typeof mensaje.texto === "string") {
        setRespuesta(mensaje.texto);
      } else if (mensaje.tipo === "aviso" || mensaje.tipo === "error") {
        setError(mensaje.mensaje ?? "La sesión de voz falló.");
      }
    };

    socket.onerror = () => setError("Se cortó la conexión con Wari.");
    socket.onclose = () => { if (sesion.current === activa) terminar(); };
  }, [conectarCaptura, reproducir, terminar]);

  const ocupado = estado === "conectando";
  const activo = estado === "escuchando" || ocupado;

  return <section className="mic-panel">
    <div className="mic-copy">
      <h2>Contale tu día a Wari</h2>
      <p>Tocá el botón y hablá normal: «vendí dos panes a tres soles». Wari lo anota en tu libro mientras hablás.</p>
    </div>
    <button type="button" className={`mic-button${activo ? " activa" : ""}`} onClick={activo ? terminar : () => void empezar()} aria-busy={ocupado}>
      {ocupado ? <Loader2 size={18} aria-hidden="true"/> : activo ? <Square size={16} aria-hidden="true"/> : <Mic size={18} aria-hidden="true"/>}
      {ocupado ? "Conectando…" : activo ? "Terminar" : "Hablar con Wari"}
    </button>
    <p className="mic-estado" role="status">
      {estado === "escuchando" ? "Wari te está escuchando." : ocupado ? "Abriendo la sesión de voz…" : "Micrófono apagado."}
    </p>
    {transcripcion && <blockquote className="mic-transcripcion">{transcripcion}</blockquote>}
    {respuesta && <blockquote className="mic-respuesta"><span>Wari</span>{respuesta}</blockquote>}
    {error && <p className="mic-error" role="alert">{error}</p>}
  </section>;
}
