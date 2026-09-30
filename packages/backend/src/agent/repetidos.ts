/**
 * La voz a veces pide la misma herramienta dos, tres o cuatro veces seguidas
 * por una sola frase: la persona dijo "vendí una casaca en 40" y el libro
 * terminaba con cuatro casacas. En vivo pasó más de una vez.
 *
 * Un repetido es el mismo tipo de movimiento, el mismo monto y la misma frase
 * de la persona, dentro de una ventana corta. La frase es lo que lo delata: dos
 * ventas iguales de verdad vienen de dos frases distintas. Si vendió varias
 * unidades en una frase, el prompt le pide al modelo una sola venta con el
 * total.
 *
 * Se guarda la promesa, no el resultado: las llamadas repetidas llegan casi a
 * la vez, antes de que la primera termine de escribir en la base.
 */
export const VENTANA_REPETIDOS_MS = 90_000;

type Registro = { cuando: number; id: Promise<string> };

export class FiltroRepetidos {
  private readonly recientes = new Map<string, Registro>();

  constructor(
    private readonly ventanaMs = VENTANA_REPETIDOS_MS,
    private readonly ahora: () => number = Date.now,
  ) {}

  static clave(tipo: string, monto: number, frase: string): string {
    return [tipo, monto.toFixed(2), frase.trim().toLowerCase().replace(/\s+/g, " ")].join("|");
  }

  /**
   * Anota una sola vez. Si ya se anotó lo mismo hace poco, devuelve el id del
   * primero con `repetido: true` y no vuelve a escribir.
   */
  async anotar(clave: string, escribir: () => Promise<string>): Promise<{ id: string; repetido: boolean }> {
    const momento = this.ahora();
    for (const [otra, registro] of this.recientes) {
      if (momento - registro.cuando > this.ventanaMs) this.recientes.delete(otra);
    }

    const previo = this.recientes.get(clave);
    if (previo) return { id: await previo.id, repetido: true };

    const id = escribir();
    this.recientes.set(clave, { cuando: momento, id });
    try {
      return { id: await id, repetido: false };
    } catch (error) {
      // Si falló, no quedó nada escrito: el siguiente intento tiene que poder anotarlo.
      this.recientes.delete(clave);
      throw error;
    }
  }
}
