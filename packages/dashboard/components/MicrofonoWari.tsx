"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, Square } from "lucide-react";
import type { Idioma } from "../lib/idioma";
import { textos } from "../lib/textos";

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

/**
 * Lo que está haciendo Wari. Llega del backend, que lo saca de los eventos de
 * la API: si dice "anotando", hay una herramienta de registro en curso.
 */
type Fase = "escuchando" | "oyendo" | "pensando" | "hablando" | "anotando" | "revisando";
const FASES: readonly Fase[] = ["escuchando", "oyendo", "pensando", "hablando", "anotando", "revisando"];

/**
 * Un turno de la conversación. Antes el panel mostraba solo la última frase de
 * cada lado y cada respuesta pisaba a la anterior: no se podía seguir el hilo.
 * Ahora queda la conversación, que es lo que se ve en una demo.
 */
type Turno = { id: number; quien: "tu" | "wari"; texto: string; final: boolean };

/** Suficiente para seguir el hilo sin empujar el libro fuera de la pantalla. */
const TURNOS_VISIBLES = 6;

type Sesion = {
  socket: WebSocket;
  contexto: AudioContext;
  /** Mide la voz de Wari antes de que salga por el parlante. */
  medidorWari: AnalyserNode;
  /** Mide el micrófono. No va al parlante: nadie quiere escucharse a sí mismo. */
  medidorTu: AnalyserNode;
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

/** Volumen de una señal entre 0 y 1: la raíz cuadrática media, ya con curva. */
function volumen(medidor: AnalyserNode, muestras: Float32Array<ArrayBuffer>): number {
  medidor.getFloatTimeDomainData(muestras);
  let suma = 0;
  for (let i = 0; i < muestras.length; i += 1) suma += muestras[i] * muestras[i];
  // La voz hablada ronda un RMS de 0,02 a 0,2; la raíz la abre para que una voz
  // normal mueva el orbe y un grito no lo sature.
  return Math.min(1, Math.sqrt(Math.sqrt(suma / muestras.length)) * 1.6);
}

/**
 * `idioma` decide los textos y también en qué idioma habla Wari: viaja al
 * backend en el mensaje `iniciar`. Las frases de ejemplo de la conversación
 * vacía enseñan sin instrucciones, en el idioma de la persona.
 */
export function MicrofonoWari({ idioma }: { idioma: Idioma }) {
  const t = textos(idioma).wari;
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("inactivo");
  const [fase, setFase] = useState<Fase>("escuchando");
  const orbe = useRef<HTMLDivElement>(null);
  const cuadro = useRef<number | null>(null);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const siguienteId = useRef(0);
  const [error, setError] = useState("");
  const sesion = useRef<Sesion | null>(null);

  const detenerOrbe = useCallback((): void => {
    if (cuadro.current !== null) cancelAnimationFrame(cuadro.current);
    cuadro.current = null;
    orbe.current?.style.setProperty("--nivel", "0");
  }, []);

  /**
   * El orbe se mueve con el volumen real: el de Wari cuando habla, el tuyo
   * cuando hablás vos. Se escribe una variable CSS por cuadro, sin pasar por el
   * estado de React: sesenta renders por segundo no los aguanta ningún teléfono.
   * Quien pidió menos movimiento no pone en marcha el bucle.
   */
  const animarOrbe = useCallback((activa: Sesion): void => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const muestras = new Float32Array(activa.medidorWari.fftSize);
    let suave = 0;
    const paso = (): void => {
      if (activa.cerrada || !orbe.current) return;
      const wari = volumen(activa.medidorWari, muestras);
      const tu = volumen(activa.medidorTu, muestras);
      const nivel = Math.max(wari, tu);
      // Sube rápido y baja despacio, como un vúmetro: se ve vivo sin temblar.
      suave = nivel > suave ? suave + (nivel - suave) * 0.5 : suave + (nivel - suave) * 0.12;
      orbe.current.style.setProperty("--nivel", suave.toFixed(3));
      orbe.current.dataset.voz = wari >= tu ? "wari" : "tu";
      cuadro.current = requestAnimationFrame(paso);
    };
    cuadro.current = requestAnimationFrame(paso);
  }, []);

  const terminar = useCallback((): void => {
    const activa = sesion.current;
    sesion.current = null;
    setEstado("inactivo");
    detenerOrbe();
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
  }, [detenerOrbe]);

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
    fuente.connect(activa.medidorWari);
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

    origen.connect(activa.medidorTu);
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
    setTurnos([]);
    setFase("escuchando");
    setEstado("conectando");

    const wsUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL;
    if (!wsUrl) {
      setError(t.faltaWs);
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
      setError(t.sinMicrofono);
      setEstado("inactivo");
      return;
    }

    let token: string;
    try {
      const respuesta = await fetch("/api/voz/token", { method: "POST", cache: "no-store" });
      const datos = (await respuesta.json()) as { token?: string; error?: string };
      if (!respuesta.ok || !datos.token) throw new Error(datos.error ?? t.rechazada);
      token = datos.token;
    } catch (fallo) {
      for (const canal of pista.getTracks()) canal.stop();
      setError(fallo instanceof Error ? fallo.message : t.sinSesion);
      setEstado("inactivo");
      return;
    }

    const contexto = new AudioContext({ sampleRate: HZ });
    const medidorWari = contexto.createAnalyser();
    medidorWari.fftSize = 512;
    medidorWari.connect(contexto.destination);
    const medidorTu = contexto.createAnalyser();
    medidorTu.fftSize = 512;
    const socket = new WebSocket(wsUrl);
    const activa: Sesion = {
      socket, contexto, medidorWari, medidorTu, pista,
      nodos: [medidorWari, medidorTu], fuentes: new Set(), siguienteInicio: 0, cerrada: false,
    };
    sesion.current = activa;

    socket.onopen = () => {
      socket.send(JSON.stringify({ tipo: "iniciar", token, idioma }));
      void conectarCaptura(activa, contexto.createMediaStreamSource(pista));
    };

    socket.onmessage = (evento: MessageEvent<string>) => {
      let mensaje: { tipo?: string; audio?: string; texto?: string; final?: boolean; mensaje?: string; estado?: string };
      try {
        mensaje = JSON.parse(evento.data);
      } catch {
        return;
      }
      if (mensaje.tipo === "listo") {
        setEstado("escuchando");
        animarOrbe(activa);
      } else if (mensaje.tipo === "estado" && FASES.includes(mensaje.estado as Fase)) {
        setFase(mensaje.estado as Fase);
      } else if (mensaje.tipo === "anotado") {
        // La fila nueva aparece en el momento en que queda escrita.
        router.refresh();
      } else if (mensaje.tipo === "audio" && mensaje.audio) {
        reproducir(activa, deBase64(mensaje.audio));
      } else if (mensaje.tipo === "limpiar") {
        // Wari fue interrumpido: lo que quedaba por sonar ya no corresponde.
        activa.fuentes.forEach((fuente) => fuente.stop());
        activa.fuentes.clear();
        activa.siguienteInicio = 0;
      } else if (mensaje.tipo === "transcripcion" && typeof mensaje.texto === "string") {
        const texto = mensaje.texto;
        const final = mensaje.final === true;
        setTurnos((previos) => {
          const ultimo = previos[previos.length - 1];
          // Mientras la persona habla llegan versiones parciales de la misma
          // frase: se actualiza su burbuja en vez de abrir una nueva por cada una.
          if (ultimo && ultimo.quien === "tu" && !ultimo.final) {
            return [...previos.slice(0, -1), { ...ultimo, texto, final }];
          }
          siguienteId.current += 1;
          return [...previos, { id: siguienteId.current, quien: "tu" as const, texto, final }].slice(-TURNOS_VISIBLES);
        });
      } else if (mensaje.tipo === "wari" && typeof mensaje.texto === "string") {
        const texto = mensaje.texto;
        siguienteId.current += 1;
        const id = siguienteId.current;
        setTurnos((previos) => [...previos, { id, quien: "wari" as const, texto, final: true }].slice(-TURNOS_VISIBLES));
      } else if (mensaje.tipo === "aviso" || mensaje.tipo === "error") {
        setError(mensaje.mensaje ?? t.fallo);
      }
    };

    socket.onerror = () => setError(t.cortada);
    socket.onclose = () => { if (sesion.current === activa) terminar(); };
  }, [animarOrbe, conectarCaptura, idioma, reproducir, router, t, terminar]);

  const ocupado = estado === "conectando";
  const activo = estado === "escuchando" || ocupado;
  const etiqueta = estado === "escuchando" ? t.fases[fase] : ocupado ? t.conectando : t.apagado;

  return <section className="panel-wari" aria-labelledby="wari-titulo">
    <div className="wari-control">
      {/* El orbe es la cara de Wari. Decorativo para un lector de pantalla: lo
          que significa ya lo dice la etiqueta de estado que tiene al lado. */}
      <div ref={orbe} className="orbe" data-fase={estado === "escuchando" ? fase : estado} data-voz="wari" aria-hidden="true">
        <span className="orbe-halo" />
        <span className="orbe-nucleo" />
      </div>
      <div className="wari-texto">
        <h2 id="wari-titulo">{t.titulo}</h2>
        <p className="wari-fase" role="status">{etiqueta}</p>
        <button type="button" className={`mic-button${activo ? " activa" : ""}`} onClick={activo ? terminar : () => void empezar()} aria-busy={ocupado}>
          {ocupado ? <Loader2 size={18} aria-hidden="true"/> : activo ? <Square size={16} aria-hidden="true"/> : <Mic size={18} aria-hidden="true"/>}
          {ocupado ? t.conectando : activo ? t.terminar : t.hablar}
        </button>
        {error && <p className="mic-error" role="alert">{error}</p>}
      </div>
    </div>

    {turnos.length > 0 ? (
      // role="log": un lector de pantalla anuncia cada frase nueva sin repetir
      // toda la conversación.
      // El `log` va en un envoltorio y no en la lista: puesto en el <ol> le
      // quita la semántica de lista y cada <li> queda huérfano (axe: listitem).
      <div role="log" aria-live="polite" aria-label={t.conversacion}>
        <ol className="conversacion">
          {turnos.map((turno) => (
            <li key={turno.id} className={`burbuja ${turno.quien}`}>
              <span className="burbuja-quien">{turno.quien === "wari" ? "Wari" : t.tu}</span>
              <span className="burbuja-texto">{turno.texto}</span>
            </li>
          ))}
        </ol>
      </div>
    ) : (
      <div className="conversacion-vacia">
        <p>{t.vacio}</p>
        <ul>{t.ejemplos.map((ejemplo) => <li key={ejemplo}>{idioma === "en" ? `“${ejemplo}”` : `«${ejemplo}»`}</li>)}</ul>
      </div>
    )}
  </section>;
}
