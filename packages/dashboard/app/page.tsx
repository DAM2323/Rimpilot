import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import marca from "../public/logo.png";

/**
 * La puerta pública: qué es RIMPILOT antes de pedir nada.
 *
 * En español y de tú, como se habla en Perú: está hecho para vendedores
 * peruanos y verlo en su idioma es parte de lo que se muestra. Una versión
 * anterior hablaba de vos ("contale", "tocá"), que en Lima suena a otro país.
 * Los textos para la convocatoria viven aparte, en inglés, en docs/.
 */
export const metadata = {
  title: "RIMPILOT | Cuéntale tu día y el libro se escribe solo",
  description:
    "Contabilidad por voz para vendedores informales en Perú. Le cuentas a Wari lo que vendiste, lo que gastaste y lo que sacaste de la caja para ti, y tu libro se escribe solo.",
  robots: { index: true, follow: true },
};

const CUENTA = [
  { rotulo: "Vendiste", monto: "S/ 75", tono: "venta", signo: null },
  { rotulo: "Gastaste", monto: "S/ 15", tono: "gasto", signo: "−" },
  { rotulo: "Sacaste para ti", monto: "S/ 20", tono: "retiro", signo: "−" },
  { rotulo: "Te queda", monto: "S/ 40", tono: "resultado", signo: "=" },
] as const;

const PASOS = [
  {
    titulo: "Hablas como hablas",
    texto: "«Vendí tres pollos a veinticinco soles, me pagaron por Yape, gasté quince en pasaje y me saqué veinte para el almuerzo.» Sin menús, sin orden, sin palabras clave.",
  },
  {
    titulo: "Wari separa y anota",
    texto: "Encuentra tres movimientos en esa sola frase y los anota mientras sigues hablando. Antes de despedirse te pregunta lo que nadie se pregunta: ¿sacaste algo de la caja para ti?",
  },
  {
    titulo: "Cada número tiene su frase",
    texto: "Tocas cualquier registro del libro y ves las palabras exactas que lo originaron. Nada salió de una suposición.",
  },
];

const PIEZAS = [
  {
    grupo: "La voz",
    items: [
      ["AssemblyAI Voice Agent API", "Escucha en español, sabe cuándo terminaste de hablar, se deja interrumpir y llama a las herramientas que escriben en el libro."],
      ["Micrófono del navegador", "PCM16 a 24 kHz por WebSocket, siempre a través del servidor: si no, cualquiera podría escribir en el libro de otro vendedor."],
      ["Twilio", "El mismo agente por teléfono, para el vendedor que en ese momento no tiene datos."],
    ],
  },
  {
    grupo: "El libro",
    items: [
      ["Fastify y TypeScript", "Las reglas del negocio. Los totales los calcula el código, nunca el modelo: Wari lee los números, no los inventa."],
      ["PostgreSQL en Supabase", "Cada movimiento guarda la frase que lo originó. Seguridad por filas en todas las tablas."],
      ["Zod", "Nada llega a la base sin validar: ni el audio, ni la sesión, ni lo que manda el modelo."],
    ],
  },
  {
    grupo: "La confianza",
    items: [
      ["Cuentas aisladas", "Cada libro es de una persona. Cambiar un número en la dirección no muestra el de nadie más."],
      ["Topes de gasto", "Sesiones por persona, por día y por minuto, para que nadie agote la clave compartida."],
      ["axe-core y 42 pruebas", "Accesibilidad medida, no estimada, y pruebas que se comprobaron rompiendo el código a propósito."],
    ],
  },
];

export default function Landing({ searchParams }: { searchParams: { error?: string } }) {
  return <div className="landing-fondo"><main className="landing">
    <header className="landing-top">
      <Image className="landing-marca" src={marca} alt="RIMPILOT" width={200} height={157} priority />
      <div className="landing-top-derecha">
        <span className="landing-evento">AssemblyAI Voice Agent Hackathon 2026</span>
        <Link className="landing-entrar" href="/entrar">Entrar</Link>
      </div>
    </header>

    <section className="landing-hero">
      <div className="landing-hero-texto">
        <h1>Cuéntale tu día.<br /><span>El libro se escribe solo.</span></h1>
        <p className="landing-bajada">Contabilidad por voz para vendedores informales del Perú.</p>
        <p className="landing-remate"><span className="landing-regla" aria-hidden="true" /><span>Vendió 75. Tiene 40. <em>Ahora sabe por qué.</em></span></p>

        {searchParams.error && <p className="landing-error" role="alert">{searchParams.error}</p>}

        <div className="landing-acciones">
          <Link className="landing-cta" href="/crear-cuenta">Crear mi libro <ArrowRight size={18} aria-hidden="true" /></Link>
          {/*
            Probar no pide correo ni contraseña: abre un libro vacío y propio para
            esa visita (regla 12, nada compartido). Es un formulario y no un
            enlace porque crea una cuenta, y eso no se hace con un GET.
          */}
          <form method="post" action="/api/cuenta/invitado">
            <button className="landing-cta-suave" type="submit">Probar sin registrarme</button>
          </form>
        </div>
        <p className="landing-letra-chica">El libro de prueba es solo tuyo y se borra al terminar la prueba.</p>
      </div>

      {/*
        El producto funcionando, no una ilustración: el orbe de Wari, un pedazo
        de conversación y la cuenta que sale de ella. Es la misma cuenta que
        muestra el libro de verdad.
      */}
      <figure className="landing-demo" aria-label="Así se ve una conversación con Wari">
        <div className="landing-demo-wari">
          <div className="orbe" data-fase="demo" aria-hidden="true"><span className="orbe-halo" /><span className="orbe-nucleo" /></div>
          <p>Wari está hablando</p>
        </div>
        <ol className="conversacion">
          <li className="burbuja tu"><span className="burbuja-quien">Tú</span><span className="burbuja-texto">Vendí tres pollos a veinticinco, gasté quince en pasaje y me saqué veinte para el almuerzo.</span></li>
          <li className="burbuja wari"><span className="burbuja-quien">Wari</span><span className="burbuja-texto">Listo, anoté las tres. Hoy te quedan cuarenta soles en caja.</span></li>
        </ol>
        <div className="cuenta cuenta-demo">
          <div className="cuenta-fila">
            {CUENTA.map(({ rotulo, monto, tono, signo }) => (
              <div className={`cuenta-termino ${tono}`} key={rotulo}>
                {signo && <span className="cuenta-signo" aria-hidden="true">{signo}</span>}
                <div><p className="cuenta-rotulo">{rotulo}</p><p className="cuenta-monto">{monto}</p></div>
              </div>
            ))}
          </div>
        </div>
      </figure>
    </section>

    <section className="landing-problema">
      <h2>Sabe cuánto vendió. No sabe dónde quedó.</h2>
      <div>
        <p>Pregúntale a un vendedor cuánto vendió hoy y te lo dice al instante. Pregúntale por qué en la caja hay menos y se encoge de hombros.</p>
        <p>Casi nunca es un robo ni una cuenta mal hecha. Es el almuerzo. El pasaje de los hijos. Veinte soles que le dio a un primo a las tres de la tarde. Plata que sacó para él y que nadie anotó, <strong>porque nadie abre una hoja de cálculo para anotar que se compró el almuerzo</strong>.</p>
        <p>Pero sí lo dice en voz alta. Por eso la voz no es la forma de usar este producto: <strong>es el producto</strong>.</p>
      </div>
    </section>

    <section className="landing-pasos" aria-labelledby="pasos-titulo">
      <h2 id="pasos-titulo">Cómo funciona</h2>
      <ol>
        {PASOS.map(({ titulo, texto }, indice) => (
          <li key={titulo}>
            <span className="landing-paso-numero" aria-hidden="true">{indice + 1}</span>
            <h3>{titulo}</h3>
            <p>{texto}</p>
          </li>
        ))}
      </ol>
    </section>

    <section className="landing-piezas" aria-labelledby="piezas-titulo">
      <h2 id="piezas-titulo">Con qué está hecho</h2>
      <p className="landing-piezas-bajada">Cada pieza está por una razón concreta, no para llenar una lista.</p>
      <div className="landing-piezas-grupos">
        {PIEZAS.map(({ grupo, items }) => (
          <div key={grupo}>
            <h3>{grupo}</h3>
            <dl>
              {items.map(([nombre, texto]) => (
                <div key={nombre}><dt>{nombre}</dt><dd>{texto}</dd></div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>

    <section className="landing-cierre">
      <h2>Tu caja, clara.</h2>
      <p>El libro te muestra la plata que tienes, no la que vendiste.</p>
      <div className="landing-acciones">
        <Link className="landing-cta" href="/crear-cuenta">Crear mi libro <ArrowRight size={18} aria-hidden="true" /></Link>
        <form method="post" action="/api/cuenta/invitado">
          <button className="landing-cta-suave" type="submit">Probar sin registrarme</button>
        </form>
      </div>
    </section>

    <footer className="landing-pie">
      <p>RIMPILOT no evalúa crédito, no se conecta a bancos y no da consejos financieros. Ordena lo que la persona dice sobre su propia plata.</p>
      <a href="https://github.com/DAM2323/Rimpilot">Código en GitHub</a>
    </footer>
  </main></div>;
}
