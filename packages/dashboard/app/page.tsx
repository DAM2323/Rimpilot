import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, Braces, Database, FileCheck2, Mic, PhoneCall, ScanEye,
  ShieldCheck, Type, Waves,
} from "lucide-react";
import marca from "../public/logo.png";

/**
 * La puerta pública. Antes el sitio entero pedía contraseña, así que quien
 * abría la URL —un jurado, un vendedor, cualquiera— veía una ventana de
 * credenciales y nada más. El libro con la plata real sigue detrás de la clave,
 * en /libro; esto explica qué es RIMPILOT antes de pedir nada.
 *
 * En español porque es el producto: está hecho para vendedores en Perú y verlo
 * en su idioma es parte de lo que se muestra. Los textos para la convocatoria
 * viven aparte, en inglés, en docs/.
 */
export const metadata = {
  title: "RIMPILOT | Contale tu día y el libro se escribe solo",
  description:
    "Contabilidad por voz para vendedores informales en Perú. Contale a Wari lo que vendiste, lo que gastaste y lo que sacaste de la caja para vos, y tu libro se escribe solo.",
  robots: { index: true, follow: true },
};

const LIBRO = [
  { etiqueta: "Ventas", valor: "S/ 75", tono: "entra" },
  { etiqueta: "Gastos", valor: "−S/ 15", tono: "sale" },
  { etiqueta: "Sacaste para ti", valor: "−S/ 20", tono: "retiro" },
  { etiqueta: "Caja", valor: "S/ 40", tono: "caja" },
];

const PASOS = [
  {
    icono: Mic,
    titulo: "Hablás como hablás",
    texto: "«Vendí tres pollos a veinticinco soles, me pagaron por Yape, gasté quince en pasaje y me saqué veinte para el almuerzo.» Sin menús, sin orden, sin palabras clave.",
  },
  {
    icono: Waves,
    titulo: "Wari separa y anota",
    texto: "Reconoce tres movimientos en esa sola frase y los registra mientras seguís hablando. Antes de cerrar pregunta lo que nadie se pregunta: ¿sacaste algo de la caja para vos?",
  },
  {
    icono: ScanEye,
    titulo: "Cada número se puede rastrear",
    texto: "Tocá cualquier registro del libro y vas a ver el fragmento exacto que dijiste y que lo originó. Nada salió de una suposición.",
  },
];

const HERRAMIENTAS = [
  {
    icono: Waves,
    nombre: "AssemblyAI Voice Agent API",
    texto: "La voz de punta a punta: escucha en español, detecta cuándo terminaste de hablar, se deja interrumpir y llama a las herramientas que escriben en el libro.",
  },
  {
    icono: Mic,
    nombre: "Micrófono del navegador",
    texto: "PCM16 a 24 kHz vía WebSocket. El audio pasa por nuestro servidor, nunca directo: si no, cualquiera podría escribir en el libro de otro vendedor.",
  },
  {
    icono: PhoneCall,
    nombre: "Twilio Media Streams",
    texto: "El mismo agente por teléfono, en G.711 μ-law a 8 kHz, para el vendedor que en ese momento no tiene datos. Un solo puente para los dos canales.",
  },
  {
    icono: Braces,
    nombre: "Fastify · TypeScript",
    texto: "El puente de voz y las reglas del negocio. Los totales los calcula el código, nunca el modelo: Wari lee los números, no los inventa.",
  },
  {
    icono: Database,
    nombre: "PostgreSQL · Supabase",
    texto: "Cada movimiento guarda la transcripción que lo originó. Row Level Security en todas las tablas y ninguna política abierta al navegador.",
  },
  {
    icono: ShieldCheck,
    nombre: "Semgrep · axe-core · Playwright",
    texto: "437 reglas de seguridad y accesibilidad medida, no estimada: cero violaciones WCAG AA en escritorio y en móvil, en todos los estados.",
  },
  {
    icono: FileCheck2,
    nombre: "Zod",
    texto: "Nada llega a la base sin validar: el webhook, cada frame del audio y cada argumento que manda el modelo pasan por un esquema antes de tocar el libro.",
  },
  {
    icono: Type,
    nombre: "Next.js 14 · Inter",
    texto: "El libro, con numerales tabulares para que los montos se alineen dígito a dígito. CSP estricta con nonce por request, sin inline ni eval.",
  },
];

export default function Landing({ searchParams }: { searchParams: { error?: string } }) {
  return <main className="landing">
    <div className="landing-brillo" aria-hidden="true" />

    <header className="landing-top">
      <Image className="landing-marca" src={marca} alt="RIMPILOT" width={200} height={157} priority />
      <div className="landing-top-derecha">
        <span className="landing-evento">AssemblyAI Voice Agent Hackathon 2026</span>
        <Link className="landing-entrar" href="/entrar">Entrar</Link>
      </div>
    </header>

    <section className="landing-hero">
      <div>
        <h1>Contale tu día.<br /><span>El libro se escribe solo.</span></h1>
        <p className="landing-bajada">
          Contabilidad por voz para vendedores informales en Perú.
        </p>
        <div className="landing-remate">
          <span className="landing-regla" />
          <p>Vendió 75. Tiene 40. <em>Ahora sabe por qué.</em></p>
        </div>
        {searchParams.error && <p className="landing-error" role="alert">{searchParams.error}</p>}

        <div className="landing-acciones">
          <Link className="landing-cta" href="/crear-cuenta">
            Crear mi libro <ArrowRight size={18} aria-hidden="true" />
          </Link>
          {/*
            Probar no pide correo ni contraseña: el botón abre un libro vacío y
            propio para esa visita (regla 12, nada compartido). Es un formulario
            y no un enlace porque crea una cuenta, y eso no se hace con un GET.
          */}
          <form method="post" action="/api/cuenta/invitado">
            <button className="landing-cta-suave" type="submit">Probar sin registrarme</button>
          </form>
        </div>
        <p className="landing-letra-chica">
          El libro de prueba es solo tuyo y se pierde al cerrar la sesión.
        </p>
      </div>

      <div className="landing-libro" role="img" aria-label="Ventas 75 soles, gastos 15, retiros 20, caja 40">
        {LIBRO.map(({ etiqueta, valor, tono }) => (
          <div className={`landing-fila ${tono}`} key={etiqueta}>
            <span>{etiqueta}</span><strong>{valor}</strong>
          </div>
        ))}
      </div>
    </section>

    <section className="landing-problema">
      <h2>Sabe cuánto vendió. No sabe dónde quedó.</h2>
      <p>
        Preguntale a un vendedor cuánto vendió hoy y te lo dice al instante.
        Preguntale por qué en la caja hay menos y se encoge de hombros.
      </p>
      <p>
        Casi nunca es un robo ni una cuenta mal hecha. Es el almuerzo. El pasaje
        de los hijos. Veinte soles que le dio a un primo a las tres de la tarde.
        Plata que sacó para él y que nadie anotó, <strong>porque nadie abre una
        planilla para registrar que se compró el almuerzo</strong>.
      </p>
      <p>
        Pero sí lo dice en voz alta. Por eso la voz no es la interfaz de este
        producto: <strong>es el producto</strong>.
      </p>
    </section>

    <section className="landing-pasos">
      {PASOS.map(({ icono: Icono, titulo, texto }) => (
        <article key={titulo}>
          <span className="landing-paso-icono"><Icono size={20} aria-hidden="true" /></span>
          <h3>{titulo}</h3>
          <p>{texto}</p>
        </article>
      ))}
    </section>

    <section className="landing-stack">
      <div className="landing-stack-intro">
        <h2>Con qué está hecho</h2>
        <p>
          Cada pieza está acá por una razón concreta, no por figurar en una lista.
        </p>
      </div>
      <div className="landing-stack-grid">
        {HERRAMIENTAS.map(({ icono: Icono, nombre, texto }) => (
          <article key={nombre}>
            <span className="landing-stack-icono"><Icono size={18} aria-hidden="true" /></span>
            <h3>{nombre}</h3>
            <p>{texto}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="landing-cierre">
      <h2>Tu caja, clara.</h2>
      <p>El libro muestra la plata que tenés, no la que vendiste.</p>
      <div className="landing-acciones centradas">
        <Link className="landing-cta" href="/crear-cuenta">
          Crear mi libro <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <form method="post" action="/api/cuenta/invitado">
          <button className="landing-cta-suave" type="submit">Probar sin registrarme</button>
        </form>
      </div>
    </section>

    <footer className="landing-pie">
      <p>
        RIMPILOT no evalúa crédito, no se conecta a bancos y no da consejos
        financieros. Ordena lo que la persona dice sobre su propia plata.
      </p>
      <a href="https://github.com/DAM2323/Rimpilot">Código en GitHub</a>
    </footer>
  </main>;
}
