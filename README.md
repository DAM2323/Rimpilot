# RIMPILOT

**Contabilidad por voz para vendedores informales.** La persona habla —desde el navegador o por teléfono—, le cuenta a Wari lo que vendió, lo que gastó y lo que sacó de la caja para ella, y RIMPILOT lo ordena en un libro contable que se ve al instante en el dashboard.

El problema que resuelve cabe en una resta: el vendedor sabe que vendió S/ 75 y no sabe por qué en la caja hay S/ 40. Lo que falta casi siempre es la plata que se sacó durante el día y no anotó nadie.

RIMPILOT fue creado desde cero para el AssemblyAI Voice Agent Hackathon 2026. El MVP no evalúa crédito ni se conecta a bancos: crea el historial ordenado que puede habilitar eso en el futuro.

## Qué incluye

- **Micrófono del navegador**: el vendedor abre el panel, toca un botón y habla. Es el canal principal y el que cualquiera puede probar sin llamar a ningún número.
- Llamada entrante por Twilio Media Streams, para el vendedor que no tiene datos en ese momento.
- Un solo puente de voz para los dos canales: G.711 μ-law (`audio/pcmu`) para el teléfono y PCM16 a 24 kHz (`audio/pcm`) para el navegador, sin recodificar audio en ninguno de los dos.
- Wari, agente conversacional en español con cuatro herramientas: venta, gasto, **retiro personal** y resumen diario. Antes de cerrar pregunta una vez «¿sacaste algo de la caja para ti hoy?», porque es lo que nadie anota.
- **Dos idiomas.** La portada y el libro se abren en el idioma del navegador —español para quien lo tiene en español, inglés para el resto— y se cambian con el selector ES / EN. En inglés Wari también escucha y contesta en inglés, con otra voz. Los montos siguen en soles. Los textos viven en [`lib/textos.ts`](packages/dashboard/lib/textos.ts), y una prueba falla si falta alguno en inglés.
- La proporción de la semana: cuánto de lo vendido se llevó la persona, en los últimos 7 días. La calcula el código y Wari la lee tal cual; es un hecho sobre su propia plata, no un consejo.
- PostgreSQL/Supabase con trazabilidad: cada movimiento conserva el fragmento de transcripción que lo originó.
- Dashboard Next.js responsive con resumen de caja, filtros, detalle auditable, gráfico de 7 días y actualización automática sin recargar.

## Levantarlo en menos de cinco minutos

Requisitos: Node.js 22.13+ (lo exige pnpm 11), pnpm, una base PostgreSQL de Supabase, una cuenta de AssemblyAI con acceso a Voice Agent API, Twilio y ngrok.

```bash
git clone https://github.com/DAM2323/Rimpilot.git
cd Rimpilot
pnpm install
Copy-Item .env.example .env  # PowerShell en Windows
```

1. Crea un proyecto en Supabase y ejecuta todo [packages/backend/src/db/schema.sql](packages/backend/src/db/schema.sql) en el SQL Editor. Ese archivo solo crea estructura: no deja ningún vendedor cargado.
   Si tu proyecto es de antes de las cuentas, corré [003_cuentas.sql](packages/backend/src/db/migrations/003_cuentas.sql) una sola vez: agrega correo, contraseña e invitados sin tocar los vendedores que ya estaban.
   Si es de antes del retiro personal, corré además [002_retiro_personal.sql](packages/backend/src/db/migrations/002_retiro_personal.sql) una sola vez. Archiva en `movimientos_fiado_archivado` los movimientos de fiado antes de borrarlos: no se convierten a retiro, porque una cuenta por cobrar no es plata que salió de la caja.
2. Completa `DATABASE_URL` y las credenciales de AssemblyAI/Twilio en `.env`. Si vas a probar el canal telefónico, rellená también `SEED_VENDOR_TELEFONO` (y opcionalmente `SEED_VENDOR_NOMBRE` y `SEED_VENDOR_NEGOCIO`) y creá ese vendedor con `pnpm --filter @rimpilot/backend seed`; falla si le falta el teléfono en lugar de inventar uno. Para el navegador no hace falta: quien entra por la web crea su cuenta desde la página.
3. Copia `packages/dashboard/.env.local.example` como `packages/dashboard/.env.local`. Añade ahí `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `RIMPILOT_SESSION_SECRET` (mínimo 32 caracteres: `openssl rand -base64 32`). Ese secreto firma la cookie de sesión y **sin él el libro responde 503**, porque muestra la plata y las transcripciones de una persona real. Cada vendedor ve solo su propio libro: todas las consultas filtran por el id de su sesión.
4. Arranca el backend y abre un túnel público:

```bash
pnpm dev:backend
ngrok http 3001
```

5. Copia la URL HTTPS de ngrok a `PUBLIC_URL` (por ejemplo, `https://abc.ngrok.app`) y reinicia el backend. En el número de Twilio configura **A call comes in** como `POST https://abc.ngrok.app/twilio/voice`.
6. En otra terminal inicia el dashboard con `pnpm dev:dashboard` y abre `http://localhost:3000`.

Si faltan variables del dashboard, el panel muestra ceros y una advertencia de configuración; nunca simula datos contables.

Los pasos 4 y 5 solo hacen falta para el canal telefónico. Para hablar por el micrófono del navegador alcanza con el backend en `:3001` y estas tres variables: `RIMPILOT_INTERNAL_KEY` en `.env` y, en `packages/dashboard/.env.local`, la misma `RIMPILOT_INTERNAL_KEY` más `RIMPILOT_BACKEND_URL` y `NEXT_PUBLIC_BACKEND_WS_URL`.

## Comprobar el audio antes de la demo

Haz esta comprobación antes de probar lógica contable:

1. En el panel, toca **Hablar con Wari** y dale permiso al micrófono. El estado debe pasar a «Wari te está escuchando» y lo que digas aparece transcrito debajo del botón.
2. Confirma en los logs del backend `Wari listo para recibir audio` y eventos de la sesión.
3. Interrumpe a Wari mientras habla; el audio debe detenerse de inmediato.
4. Si vas a usar también el teléfono, llama al número de Twilio y repite los tres pasos.
5. Recién entonces prueba movimientos. El navegador manda PCM16 a 24 kHz y Twilio μ-law a 8 kHz; el puente configura la sesión con el formato de cada canal y reenvía los payloads en Base64 sin pérdida por conversión.

El micrófono exige un origen seguro: `localhost` sirve tal cual, pero al desplegar el panel tiene que estar en HTTPS o el navegador no entrega el audio.

## Demo reproducible

Sigue el [guion de demo](docs/demo-script.md), que incluye los subtítulos en
inglés para el video. Los textos de la convocatoria y las 10 slides están en
inglés en [docs/hackathon-submission.md](docs/hackathon-submission.md) y
[docs/slides.md](docs/slides.md).

> “Vendí tres pollos a veinticinco soles cada uno, me pagaron por Yape. Gasté quince en pasaje y me saqué veinte para el almuerzo.”

Wari registra tres movimientos y, al cerrar, lee ventas `S/ 75`, gastos `S/ 15`, retiros `S/ 20` y caja `S/ 40`. Vendió 75 y le quedan 40: esa resta es el producto. El dashboard muestra cada entrada y la transcripción que la originó.

## Las puertas

| Ruta | Qué es | Acceso |
| --- | --- | --- |
| `/` | Landing: el problema, la resta de 75 a 40 y con qué está hecho | **pública** |
| `/crear-cuenta` | Correo y contraseña, y el libro queda abierto | **pública** |
| `/entrar` | Volver a un libro que ya existe | **pública** |
| `/libro` | El libro contable, con la plata y las transcripciones reales | sesión firmada |

Desde la landing se entra de dos maneras: creando una cuenta, o con **Probar sin
registrarme**, que abre un libro vacío sin pedir nada. Ese libro de prueba no es
compartido: cada visita recibe el suyo, aislado del de todos los demás (regla 12).

Y se borra de verdad. **Terminar prueba** elimina el libro del invitado, sus
movimientos y lo que dijo; no solo le quita el acceso. Para los que cierran la
pestaña sin tocarlo:

```bash
pnpm --filter @rimpilot/backend limpiar-invitados            # solo cuenta, no borra
pnpm --filter @rimpilot/backend limpiar-invitados --borrar   # borra los de más de 24 h
```

Solo toca libros de prueba: una cuenta registrada no entra en ningún caso.

La sesión es una cookie `httpOnly` firmada con HMAC —el id del vendedor no viaja
suelto— y todas las consultas del libro filtran por ese id: cambiar el UUID de
un movimiento en la URL devuelve 404, no el libro de otra persona.

La CSP y las cabeceras de seguridad se aplican a todas las rutas, públicas
incluidas; lo único que cambia es quién necesita sesión.

## Desplegarlo

Todo va a Render con un solo Blueprint ([render.yaml](render.yaml)): el panel y
el backend de voz, que sostiene un WebSocket abierto toda la conversación y no
puede vivir en una función serverless. Los pasos, las variables y el aviso del
plan gratuito están en
[docs/despliegue.md](docs/despliegue.md).

## Arquitectura

```text
Micrófono del navegador ↘
                          Fastify → AssemblyAI Voice Agent API
Teléfono → Twilio       ↗    ↘ PostgreSQL / Supabase → Next.js dashboard
```

Los dos canales entran por el mismo puente. El navegador **no** se conecta directo a
AssemblyAI aunque la API lo permita: si lo hiciera, las llamadas a herramientas
volverían al cliente y cualquiera podría pedir que se escriba en el libro de otro
vendedor. Con el backend en el medio, la clave de AssemblyAI no sale del servidor y
el `vendedor_id` sale siempre de un token firmado con HMAC, nunca de un mensaje del
navegador. El panel pide ese token desde el servidor, con una clave interna que el
cliente nunca ve.

`packages/backend` contiene el puente de voz y las reglas de negocio. `packages/dashboard` contiene el libro contable. La base de datos vive en Supabase y usa PostgreSQL directamente desde el backend.

## Arranque rapido en Windows

Doble clic en [`rimpilot.bat`](rimpilot.bat): actualiza el proyecto, instala lo
que falte, revisa que la configuracion este completa y levanta backend y panel.

Funciona desde donde lo dejes. Si lo guardas suelto en Descargas o en el
Escritorio, **busca tu copia del proyecto antes de clonar** —en la carpeta de
usuario, en Descargas, en el Escritorio— y actualiza esa. Solo clona si no
encuentra ninguna. Un mismo archivo sirve para empezar de cero y para ponerte al
dia, sin terminar con dos carpetas y editando la equivocada.

## Comandos

```bash
pnpm dev              # backend + dashboard
pnpm dev:backend      # Fastify en :3001
pnpm dev:dashboard    # Next.js en :3000
pnpm typecheck
pnpm lint
pnpm test             # sesión, cupos de voz, redirect seguro, freno de intentos…
pnpm build
```

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `ASSEMBLYAI_API_KEY` | Autentica el WebSocket de Wari. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | Reservadas para operaciones de Twilio y el número de demo. |
| `DATABASE_URL` | Conexión PostgreSQL de Supabase para el backend. |
| `PUBLIC_URL` | URL pública del backend, normalmente la URL HTTPS de ngrok en desarrollo. |
| `STREAM_TOKEN_SECRET` | Firma el token que autoriza el Media Stream. Mínimo 32 caracteres; el backend falla al arrancar una llamada sin él. |
| `MAX_LLAMADAS_CONCURRENTES` | Tope de sesiones simultáneas de AssemblyAI. Es un solo contador para el teléfono y el navegador. Por defecto 5. |
| `MAX_SESIONES_POR_VENDEDOR_DIA` | Sesiones de voz por vendedor por día de Lima. Por defecto 20. |
| `MAX_SESIONES_DIA` | Sesiones de voz por día en total. Por defecto 200. Es el tope que acota el gasto: el modo invitado da una cuenta por visita, así que la cuota por vendedor sola no alcanza. |
| `MAX_MINUTOS_POR_SESION` | Duración máxima de una sesión. Por defecto 10. Una pestaña olvidada con el micrófono abierto no factura para siempre. |
| `RIMPILOT_INTERNAL_KEY` | Clave servidor-a-servidor con la que el panel pide el token del micrófono. Mínimo 32 caracteres; sin ella `/navegador/token` responde 503. Va también en `packages/dashboard/.env.local`. |
| `RIMPILOT_ORIGENES_PERMITIDOS` | Orígenes que pueden abrir el WebSocket del navegador, separados por coma. Vacío = solo `localhost`. |
| `ASSEMBLYAI_VOICE_URL` | Opcional. Solo para apuntar a un mock en pruebas; vacío usa la API real. |
| `ASSEMBLYAI_VOZ` | Opcional. La voz de Wari; vacío usa `lola`, la única del catálogo con acento nativo en español. Solo se aceptan nombres del [catálogo](https://www.assemblyai.com/docs/voice-agents/voice-agent-api/voices): uno inventado no arranca el backend, porque la API lo ignora en silencio y habla en inglés. |
| `ASSEMBLYAI_VOZ_EN` | Opcional. La voz de Wari cuando el panel está en inglés; vacío usa `jane`, de acento estadounidense. Mismo catálogo y misma validación. |
| `SEED_VENDOR_TELEFONO`, `SEED_VENDOR_NOMBRE`, `SEED_VENDOR_NEGOCIO` | Vendedor del canal telefónico para `pnpm --filter @rimpilot/backend seed`. El teléfono es obligatorio; nombre y negocio quedan en `NULL` si no los das. Quien entra por la web no lo necesita. |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Van en `packages/dashboard/.env.local`. La key nunca se expone al navegador. |
| `RIMPILOT_SESSION_SECRET` | Firma la cookie de sesión del panel, en `packages/dashboard/.env.local`. Mínimo 32 caracteres y obligatoria: sin ella el libro devuelve 503 y nadie entra. |
| `NEXT_PUBLIC_SITE_URL` | URL pública del panel; alimenta metadata, Open Graph y `sitemap.xml`. |
| `RIMPILOT_BACKEND_URL`, `NEXT_PUBLIC_BACKEND_WS_URL` | En `packages/dashboard/.env.local`. La primera la usa el servidor de Next para pedir el token; la segunda la usa el navegador para abrir el WebSocket, y su origen se agrega a `connect-src` de la CSP. |

## Roadmap

Historial verificable y exportable para microfinancieras, conciliación voluntaria de pagos y soporte de lenguas locales. El MVP no ofrece consejo financiero ni toma decisiones de crédito.

## Licencia

[MIT](LICENSE).
