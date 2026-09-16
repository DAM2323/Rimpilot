/**
 * AudioWorklet que convierte el micrófono al formato que espera la Voice Agent
 * API: PCM de 16 bits con signo, little-endian, mono. El AudioContext ya se crea
 * a 24 000 Hz, así que acá no se remuestrea nada.
 *
 * Este archivo se carga con `audioWorklet.addModule()`, que la CSP del panel
 * revisa contra `script-src`. Se verificó en Chromium que `'strict-dynamic'` no
 * lo bloquea cuando lo pide un script con nonce; el componente igual cae a un
 * ScriptProcessorNode si `addModule` falla, para no depender de eso.
 */
const MUESTRAS_POR_BLOQUE = 1024; // ~42 ms a 24 kHz

class CapturaMicrofono extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pendientes = new Int16Array(MUESTRAS_POR_BLOQUE);
    this.escritas = 0;
  }

  process(entradas) {
    const canal = entradas[0]?.[0];
    if (!canal) return true;

    for (let i = 0; i < canal.length; i += 1) {
      // Recortar antes de escalar: un pico fuera de [-1, 1] daría la vuelta y
      // sonaría como un chasquido en lugar de saturar.
      const muestra = Math.max(-1, Math.min(1, canal[i]));
      this.pendientes[this.escritas] = Math.round(muestra * (muestra < 0 ? 0x8000 : 0x7fff));
      this.escritas += 1;
      if (this.escritas === MUESTRAS_POR_BLOQUE) {
        const bloque = this.pendientes.slice();
        this.port.postMessage(bloque.buffer, [bloque.buffer]);
        this.escritas = 0;
      }
    }
    return true;
  }
}

registerProcessor("captura-microfono", CapturaMicrofono);
