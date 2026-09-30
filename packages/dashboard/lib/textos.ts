import type { Idioma } from "./idioma";

/**
 * Todo lo que dice RIMPILOT, en los dos idiomas.
 *
 * El español es el original: de tú, como se habla en Perú, porque está hecho
 * para vendedores peruanos. El inglés no es una traducción palabra por palabra
 * sino el mismo tono dicho en inglés.
 *
 * `en` está tipado con la forma de `es`: si se agrega un texto en español y se
 * olvida el inglés, no compila.
 *
 * Los montos se escriben siempre en soles (`S/`) y con el formato peruano, en
 * los dos idiomas: la plata del vendedor es en soles aunque quien mire hable
 * inglés.
 */

/** Los errores de las rutas de cuenta viajan como código en `?error=` y se traducen acá. */
export type CodigoError =
  | "intentos" | "invitados" | "correo_invalido" | "clave_corta" | "datos"
  | "correo_existe" | "no_se_pudo_crear" | "credenciales" | "no_se_pudo_invitado";

const es = {
  lang: "es-PE",
  selector: { etiqueta: "Idioma", es: "Español", en: "English" },
  meta: {
    titulo: "RIMPILOT | Tu caja, clara",
    descripcion: "Cuéntale tu día y RIMPILOT lleva tus cuentas: anota tus ventas, tus gastos y la plata que sacas de la caja para ti.",
    locale: "es_PE",
  },
  landing: {
    metaTitulo: "RIMPILOT | Cuéntale tu día y lleva tus cuentas hablando",
    metaDescripcion: "RIMPILOT anota tus ventas, tus gastos y la plata que sacas de la caja para ti. Tú hablas, y al final del día sabes cuánto tienes de verdad.",
    evento: "AssemblyAI Voice Agent Hackathon 2026",
    entrar: "Entrar",
    titulo1: "Cuéntale tu día.",
    titulo2: "Lleva tus cuentas.",
    explicacion: "Anota tus ventas, tus gastos y la plata que sacas de la caja para ti. Tú hablas, y al final del día sabes cuánto tienes de verdad.",
    puntos: [
      "Anota ventas y gastos con tu voz, sin escribir nada",
      "Te dice cuánto te queda en caja",
      "Te muestra lo que sacaste para ti, lo que nadie anota",
    ],
    notaIdioma: null as string | null,
    crear: "Crear mi libro",
    probar: "Probar sin registrarme",
    letraChica: "El libro de prueba es solo tuyo y se borra al terminar la prueba.",
    demoEtiqueta: "Así se ve una conversación con RIMPILOT",
    demoHablando: "RIMPILOT está hablando",
    demoTu: "Vendí tres polos a veinticinco, gasté quince en pasaje y me saqué veinte para el almuerzo.",
    demoVoz: "Listo, anoté las tres. Hoy te quedan cuarenta soles en caja.",
    cuenta: { vendiste: "Vendiste", gastaste: "Gastaste", sacaste: "Sacaste para ti", queda: "Te queda" },
    problemaTitulo: "Sabe cuánto vendió. No sabe dónde quedó.",
    problema1: "Pregúntale a un vendedor cuánto vendió hoy y te lo dice al instante. Pregúntale por qué en la caja hay menos y se encoge de hombros.",
    problema2: "Casi nunca es un robo ni una cuenta mal hecha. Es el almuerzo. El pasaje de los hijos. Veinte soles que le dio a un primo a las tres de la tarde. Plata que sacó para él y que nadie anotó, ",
    problema2Fuerte: "porque nadie abre una hoja de cálculo para anotar que se compró el almuerzo",
    problema3: "Pero sí lo dice en voz alta. Por eso la voz no es la forma de usar este producto: ",
    problema3Fuerte: "es el producto",
    pasosTitulo: "Cómo funciona",
    pasos: [
      { titulo: "Hablas como hablas", texto: "«Vendí tres polos a veinticinco soles, me pagaron por Yape, gasté quince en pasaje y me saqué veinte para el almuerzo.» Sin menús, sin orden, sin palabras clave." },
      { titulo: "RIMPILOT separa y anota", texto: "Encuentra tres movimientos en esa sola frase y los anota mientras sigues hablando. Antes de despedirse te pregunta lo que nadie se pregunta: ¿sacaste algo de la caja para ti?" },
      { titulo: "Cada número tiene su frase", texto: "Tocas cualquier registro del libro y ves las palabras exactas que lo originaron. Nada salió de una suposición." },
    ],
    piezasTitulo: "Con qué está hecho",
    piezasBajada: "Cada pieza está por una razón concreta, no para llenar una lista.",
    piezas: [
      {
        grupo: "La voz",
        items: [
          ["AssemblyAI Voice Agent API", "Escucha en español o en inglés, sabe cuándo terminaste de hablar, se deja interrumpir y llama a las herramientas que escriben en el libro."],
          ["Micrófono del navegador", "PCM16 a 24 kHz por WebSocket, siempre a través del servidor: si no, cualquiera podría escribir en el libro de otro vendedor."],
        ],
      },
      {
        grupo: "El libro",
        items: [
          ["Fastify y TypeScript", "Las reglas del negocio. Los totales los calcula el código, nunca el modelo: la voz lee los números, no los inventa."],
          ["PostgreSQL en Supabase", "Cada movimiento guarda la frase que lo originó. Seguridad por filas en todas las tablas."],
          ["Zod", "Nada llega a la base sin validar: ni el audio, ni la sesión, ni lo que manda el modelo."],
        ],
      },
      {
        grupo: "La confianza",
        items: [
          ["Cuentas aisladas", "Cada libro es de una persona. Cambiar un número en la dirección no muestra el de nadie más."],
          ["Topes de gasto", "Sesiones por persona, por día y por minuto, para que nadie agote la clave compartida."],
          ["axe-core y pruebas automáticas", "Accesibilidad medida, no estimada, y pruebas que se comprobaron rompiendo el código a propósito."],
        ],
      },
    ] as Array<{ grupo: string; items: Array<[string, string]> }>,
    cierreTitulo: "Tu caja, clara.",
    cierreTexto: "El libro te muestra la plata que tienes, no la que vendiste.",
    pie: "RIMPILOT no evalúa crédito, no se conecta a bancos y no da consejos financieros. Ordena lo que la persona dice sobre su propia plata.",
    codigo: "Código en GitHub",
  },
  puerta: {
    entrarMeta: "Entrar",
    entrarTitulo: "Entra a tu libro",
    entrarBajada: "Tu caja, como la dejaste.",
    correo: "Correo",
    clave: "Contraseña",
    entrarBoton: "Entrar",
    sinLibro: "¿Todavía no tienes libro?",
    creaCuenta: "Crea tu cuenta",
    crearMeta: "Crear cuenta",
    crearTitulo: "Abre tu libro",
    crearBajada: "Dos datos y ya puedes contarle tu día.",
    minimo: "Mínimo 8 caracteres.",
    nombre: "Tu nombre",
    negocio: "Tu negocio",
    opcional: "(opcional)",
    crearBoton: "Crear mi libro",
    conCuenta: "¿Ya tienes cuenta?",
    entra: "Entra",
  },
  errores: {
    intentos: "Demasiados intentos. Espera unos minutos.",
    invitados: "Demasiados libros de prueba desde aquí. Espera unos minutos.",
    correo_invalido: "Ese correo no parece válido.",
    clave_corta: "La contraseña necesita al menos 8 caracteres.",
    datos: "Revisa los datos.",
    correo_existe: "Ya hay una cuenta con ese correo. Prueba entrando.",
    no_se_pudo_crear: "No pudimos crear la cuenta. Prueba de nuevo.",
    credenciales: "Correo o contraseña incorrectos.",
    no_se_pudo_invitado: "No pudimos abrir el libro de prueba. Prueba de nuevo.",
  } satisfies Record<CodigoError, string>,
  libro: {
    saludo: { manana: "Buenos días", tarde: "Buenas tardes", noche: "Buenas noches" },
    irPortada: "RIMPILOT, ir a la portada",
    salir: "Salir",
    terminarPrueba: "Terminar prueba",
    invitadoFuerte: "Estás probando RIMPILOT.",
    invitadoTexto: " Este libro es solo tuyo y nadie más lo ve. Se borra cuando termines la prueba: ",
    invitadoEnlace: "crea tu cuenta",
    invitadoFin: " para conservarlo.",
    sinConectarFuerte: "Panel sin conectar.",
    sinConectarTexto: " Configura las variables en packages/dashboard/.env.local para mostrar el libro real. No se muestran datos de demostración.",
    movimientos: "Movimientos",
    registros: (n: number) => (n === 1 ? "1 registro" : `${n} registros`),
    filtrarTipo: "Filtrar por tipo",
    tipos: { todos: "Todos", venta: "Ventas", gasto: "Gastos", retiro: "Retiros" },
    filtrarFecha: "Filtrar por fecha",
    desde: "Desde",
    hasta: "Hasta",
    aplicar: "Aplicar",
    quitarFechas: "Quitar fechas",
    ultimos7: "Últimos 7 días",
    entroSalio: "Lo que entró y lo que salió",
  },
  cuenta: {
    titulo: "La cuenta de hoy",
    vendiste: "Vendiste",
    gastaste: "Gastaste en el negocio",
    sacaste: "Sacaste para ti",
    queda: "Te queda en caja",
    menos: "menos",
    igual: "igual a",
    semana: "Esta semana sacaste para ti ",
  },
  lista: {
    vacioTitulo: "Aún no hay movimientos",
    vacioTexto: "Toca Empezar a hablar y cuenta lo que vendiste, lo que gastaste y lo que sacaste para ti. Aparecerá aquí automáticamente.",
    etiqueta: "Movimientos",
    tipos: { venta: "Venta", gasto: "Gasto", retiro: "Retiro" },
  },
  grafico: {
    etiqueta: "Ventas, gastos y retiros de los últimos siete días",
    series: { ventas: "Ventas", gastos: "Gastos", retiros: "Retiros" },
  },
  detalle: {
    volver: "Volver al libro",
    tipos: { venta: "Venta", gasto: "Gasto del negocio", retiro: "Retiro personal" },
    metodo: "Método de pago",
    sinMetodo: "No especificado",
    metodos: { efectivo: "Efectivo", yape: "Yape", plin: "Plin", transferencia: "Transferencia" } as Record<string, string>,
    contraparte: "Contraparte",
    origen: "Origen de este registro",
    origenBajada: "Lo que RIMPILOT te escuchó decir.",
    sinTranscripcion: "No se guardó una transcripción para este movimiento.",
  },
  noEncontrada: {
    titulo: "Esta página no existe",
    texto: "Puede que el movimiento se haya borrado, o que el enlace esté incompleto. Tu libro sigue intacto.",
    volver: "Volver al libro",
  },
  wari: {
    titulo: "Cuéntale tu día",
    fases: {
      escuchando: "Te escucho",
      oyendo: "Escuchándote…",
      pensando: "Pensando…",
      hablando: "RIMPILOT está hablando",
      anotando: "Anotando en tu libro…",
      revisando: "Revisando tu caja…",
    },
    conectando: "Conectando…",
    apagado: "Micrófono apagado",
    hablar: "Empezar a hablar",
    terminar: "Terminar",
    conversacion: "Conversación con RIMPILOT",
    tu: "Tú",
    vacio: "Habla como hablas. Por ejemplo:",
    ejemplos: [
      "Vendí tres polos a veinticinco soles, me pagaron por Yape.",
      "Gasté quince en pasaje.",
      "Me saqué veinte para el almuerzo.",
    ],
    faltaWs: "Falta NEXT_PUBLIC_BACKEND_WS_URL en packages/dashboard/.env.local.",
    sinMicrofono: "No pudimos usar el micrófono. Dale permiso al navegador y vuelve a intentarlo.",
    rechazada: "Sesión rechazada.",
    sinSesion: "No pudimos abrir la sesión de voz.",
    fallo: "La sesión de voz falló.",
    cortada: "Se cortó la conexión de voz.",
  },
  token: {
    sinConfigurar: "Falta RIMPILOT_BACKEND_URL o RIMPILOT_INTERNAL_KEY en packages/dashboard/.env.local.",
    sinSesion: "Entra a tu libro antes de empezar a hablar.",
    noResponde: "El backend de voz sigue despertando. Vuelve a intentarlo en un momento.",
    rechazo: "El backend de voz rechazó la sesión.",
    sinToken: "El backend de voz no devolvió un token.",
  },
};

export type Textos = typeof es;

const en: Textos = {
  lang: "en-US",
  selector: { etiqueta: "Language", es: "Español", en: "English" },
  meta: {
    titulo: "RIMPILOT | Your till, clear",
    descripcion: "Tell it your day and RIMPILOT keeps your books: it records your sales, your expenses and the money you take out of the till for yourself.",
    locale: "en_US",
  },
  landing: {
    metaTitulo: "RIMPILOT | Tell it your day and keep your books by talking",
    metaDescripcion: "RIMPILOT records your sales, your expenses and the money you take out of the till for yourself. You talk, and at the end of the day you know how much you really have.",
    evento: "AssemblyAI Voice Agent Hackathon 2026",
    entrar: "Sign in",
    titulo1: "Tell it your day.",
    titulo2: "Keep your books.",
    explicacion: "It records your sales, your expenses and the money you take out of the till for yourself. You talk, and at the end of the day you know how much you really have.",
    puntos: [
      "Records sales and expenses with your voice, no typing",
      "Tells you how much is left in the till",
      "Shows what you took for yourself, the part nobody writes down",
    ],
    notaIdioma: "RIMPILOT is built for Spanish-speaking vendors in Peru. In this English version it listens and answers in English, so anyone can try it.",
    crear: "Open my ledger",
    probar: "Try it without signing up",
    letraChica: "The trial ledger is yours alone and is deleted when you end the trial.",
    demoEtiqueta: "What a conversation with RIMPILOT looks like",
    demoHablando: "RIMPILOT is speaking",
    demoTu: "I sold three T-shirts at twenty-five, spent fifteen on bus fare and took twenty for lunch.",
    demoVoz: "Done, I wrote down all three. You have forty soles left in the till today.",
    cuenta: { vendiste: "You sold", gastaste: "You spent", sacaste: "You took for yourself", queda: "Left" },
    problemaTitulo: "They know what they sold. Not where it went.",
    problema1: "Ask a street vendor how much they sold today and they'll tell you on the spot. Ask why the till holds less and they shrug.",
    problema2: "It's almost never theft or bad math. It's lunch. The kids' bus fare. Twenty soles handed to a cousin at three in the afternoon. Money they took for themselves that nobody wrote down, ",
    problema2Fuerte: "because nobody opens a spreadsheet to record buying their own lunch",
    problema3: "But they do say it out loud. That's why voice isn't the way to use this product: ",
    problema3Fuerte: "it is the product",
    pasosTitulo: "How it works",
    pasos: [
      { titulo: "Talk the way you talk", texto: "“I sold three T-shirts at twenty-five soles, got paid by Yape, spent fifteen on bus fare and took twenty for lunch.” No menus, no order, no keywords." },
      { titulo: "RIMPILOT splits it and writes it down", texto: "It finds three entries in that one sentence and records them while you keep talking. Before saying goodbye it asks what nobody asks themselves: did you take anything out of the till for yourself?" },
      { titulo: "Every number has its sentence", texto: "Tap any entry in the ledger and see the exact words that created it. Nothing came from a guess." },
    ],
    piezasTitulo: "What it's built with",
    piezasBajada: "Every piece is there for a concrete reason, not to fill a list.",
    piezas: [
      {
        grupo: "The voice",
        items: [
          ["AssemblyAI Voice Agent API", "Listens in Spanish or English, knows when you've finished speaking, can be interrupted, and calls the tools that write to the ledger."],
          ["Browser microphone", "PCM16 at 24 kHz over WebSocket, always through the server: otherwise anyone could write to another vendor's ledger."],
        ],
      },
      {
        grupo: "The ledger",
        items: [
          ["Fastify and TypeScript", "The business rules. Totals are computed by code, never by the model: the voice reads the numbers, it doesn't make them up."],
          ["PostgreSQL on Supabase", "Every entry keeps the sentence that created it. Row-level security on every table."],
          ["Zod", "Nothing reaches the database unvalidated: not the audio, not the session, not what the model sends."],
        ],
      },
      {
        grupo: "Trust",
        items: [
          ["Isolated accounts", "Each ledger belongs to one person. Changing a number in the address shows nobody else's."],
          ["Spending caps", "Sessions per person, per day and per minute, so nobody drains the shared key."],
          ["axe-core and automated tests", "Accessibility measured, not estimated, and tests proven by breaking the code on purpose."],
        ],
      },
    ],
    cierreTitulo: "Your till, clear.",
    cierreTexto: "The ledger shows you the money you have, not the money you sold.",
    pie: "RIMPILOT doesn't score credit, doesn't connect to banks and doesn't give financial advice. It organizes what a person says about their own money.",
    codigo: "Code on GitHub",
  },
  puerta: {
    entrarMeta: "Sign in",
    entrarTitulo: "Sign in to your ledger",
    entrarBajada: "Your till, just as you left it.",
    correo: "Email",
    clave: "Password",
    entrarBoton: "Sign in",
    sinLibro: "Don't have a ledger yet?",
    creaCuenta: "Create your account",
    crearMeta: "Create account",
    crearTitulo: "Open your ledger",
    crearBajada: "Two details and you can start telling it your day.",
    minimo: "At least 8 characters.",
    nombre: "Your name",
    negocio: "Your business",
    opcional: "(optional)",
    crearBoton: "Create my ledger",
    conCuenta: "Already have an account?",
    entra: "Sign in",
  },
  errores: {
    intentos: "Too many attempts. Wait a few minutes.",
    invitados: "Too many trial ledgers from here. Wait a few minutes.",
    correo_invalido: "That email doesn't look valid.",
    clave_corta: "The password needs at least 8 characters.",
    datos: "Check your details.",
    correo_existe: "There's already an account with that email. Try signing in.",
    no_se_pudo_crear: "We couldn't create the account. Try again.",
    credenciales: "Wrong email or password.",
    no_se_pudo_invitado: "We couldn't open the trial ledger. Try again.",
  },
  libro: {
    saludo: { manana: "Good morning", tarde: "Good afternoon", noche: "Good evening" },
    irPortada: "RIMPILOT, go to the home page",
    salir: "Sign out",
    terminarPrueba: "End trial",
    invitadoFuerte: "You're trying RIMPILOT.",
    invitadoTexto: " This ledger is yours alone and nobody else can see it. It's deleted when you end the trial: ",
    invitadoEnlace: "create your account",
    invitadoFin: " to keep it.",
    sinConectarFuerte: "Dashboard not connected.",
    sinConectarTexto: " Set the variables in packages/dashboard/.env.local to show the real ledger. No demo data is shown.",
    movimientos: "Entries",
    registros: (n: number) => (n === 1 ? "1 entry" : `${n} entries`),
    filtrarTipo: "Filter by type",
    tipos: { todos: "All", venta: "Sales", gasto: "Expenses", retiro: "Withdrawals" },
    filtrarFecha: "Filter by date",
    desde: "From",
    hasta: "To",
    aplicar: "Apply",
    quitarFechas: "Clear dates",
    ultimos7: "Last 7 days",
    entroSalio: "What came in and what went out",
  },
  cuenta: {
    titulo: "Today's tally",
    vendiste: "You sold",
    gastaste: "You spent on the business",
    sacaste: "You took for yourself",
    queda: "Left in the till",
    menos: "minus",
    igual: "equals",
    semana: "This week you took for yourself ",
  },
  lista: {
    vacioTitulo: "No entries yet",
    vacioTexto: "Tap Start talking and say what you sold, what you spent and what you took for yourself. It will show up here automatically.",
    etiqueta: "Entries",
    tipos: { venta: "Sale", gasto: "Expense", retiro: "Withdrawal" },
  },
  grafico: {
    etiqueta: "Sales, expenses and withdrawals over the last seven days",
    series: { ventas: "Sales", gastos: "Expenses", retiros: "Withdrawals" },
  },
  detalle: {
    volver: "Back to the ledger",
    tipos: { venta: "Sale", gasto: "Business expense", retiro: "Personal withdrawal" },
    metodo: "Payment method",
    sinMetodo: "Not specified",
    metodos: { efectivo: "Cash", yape: "Yape", plin: "Plin", transferencia: "Bank transfer" },
    contraparte: "Counterparty",
    origen: "Where this entry came from",
    origenBajada: "What RIMPILOT heard you say.",
    sinTranscripcion: "No transcript was saved for this entry.",
  },
  noEncontrada: {
    titulo: "This page doesn't exist",
    texto: "The entry may have been deleted, or the link is incomplete. Your ledger is intact.",
    volver: "Back to the ledger",
  },
  wari: {
    titulo: "Tell it your day",
    fases: {
      escuchando: "I'm listening",
      oyendo: "Hearing you…",
      pensando: "Thinking…",
      hablando: "RIMPILOT is speaking",
      anotando: "Writing it in your ledger…",
      revisando: "Checking your till…",
    },
    conectando: "Connecting…",
    apagado: "Microphone off",
    hablar: "Start talking",
    terminar: "Stop",
    conversacion: "Conversation with RIMPILOT",
    tu: "You",
    vacio: "Talk the way you talk. For example:",
    ejemplos: [
      "I sold three T-shirts at twenty-five soles, paid by Yape.",
      "I spent fifteen on bus fare.",
      "I took twenty for lunch.",
    ],
    faltaWs: "NEXT_PUBLIC_BACKEND_WS_URL is missing in packages/dashboard/.env.local.",
    sinMicrofono: "We couldn't use the microphone. Allow it in your browser and try again.",
    rechazada: "Session rejected.",
    sinSesion: "We couldn't open the voice session.",
    fallo: "The voice session failed.",
    cortada: "The voice connection dropped.",
  },
  token: {
    sinConfigurar: "RIMPILOT_BACKEND_URL or RIMPILOT_INTERNAL_KEY is missing in packages/dashboard/.env.local.",
    sinSesion: "Sign in to your ledger before you start talking.",
    noResponde: "The voice backend is still waking up. Try again in a moment.",
    rechazo: "The voice backend rejected the session.",
    sinToken: "The voice backend didn't return a token.",
  },
};

const TEXTOS: Record<Idioma, Textos> = { es, en };

export function textos(idioma: Idioma): Textos {
  return TEXTOS[idioma];
}

/** El mensaje de un `?error=` conocido, o nada: un texto arbitrario en la URL no se muestra. */
export function mensajeDeError(idioma: Idioma, codigo: string | undefined): string | null {
  if (!codigo) return null;
  const errores = TEXTOS[idioma].errores as Record<string, string>;
  return Object.prototype.hasOwnProperty.call(errores, codigo) ? errores[codigo] : null;
}
