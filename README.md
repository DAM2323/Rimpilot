# RIMPILOT

**Contabilidad por voz para vendedores informales.** La persona habla —desde el navegador o por teléfono—, le cuenta a Wari lo que vendió, lo que gastó y lo que sacó de la caja para ella, y RIMPILOT lo ordena en un libro contable que se ve al instante en el dashboard.

El problema que resuelve cabe en una resta: el vendedor sabe que vendió S/ 75 y no sabe por qué en la caja hay S/ 40. Lo que falta casi siempre es la plata que se sacó durante el día y no anotó nadie.

RIMPILOT fue creado desde cero para el AssemblyAI Voice Agent Hackathon 2026. El MVP no evalúa crédito ni se conecta a bancos: crea el historial ordenado que puede habilitar eso en el futuro.

## Qué incluye

- **Micrófono del navegador**: el vendedor abre el panel, toca un botón y habla. Es el canal principal y el que cualquiera puede probar sin llamar a ningún número.
- Llamada entrante por Twilio Media Streams, para el vendedor que no tiene datos en ese momento.
- Un solo puente de voz para los dos canales: G.711 μ-law (`audio/pcmu`) para el teléfono y PCM16 a 24 kHz (`audio/pcm`) para el navegador, sin recodificar audio en ninguno de los dos.
- Wari, agente conversacional en español con cuatro herramientas: venta, gasto, **retiro personal** y resumen diario. Antes de cerrar pregunta una vez «¿sacaste algo de la caja para ti hoy?», porque es lo que nadie anota.
- La proporción de la semana: cuánto de lo vendido se llevó la persona, en los últimos 7 días. La calcula el código y Wari la lee tal cual; es un hecho sobre su propia plata, no un consejo.
- PostgreSQL/Supabase con trazabilidad: cada movimiento conserva el fragmento de transcripción que lo originó.
- Dashboard Next.js responsive con resumen de caja, filtros, detalle auditable, gráfico de 7 días y actualización automática sin recargar.

## Levantarlo en menos de cinco minutos

Requisitos: Node.js 20+, pnpm, una base PostgreSQL de Supabase, una cuenta de AssemblyAI con acceso a Voice Agent API, Twilio y ngrok.

```bash
git clone https://github.com/DAM2323/Rimpilot.git
cd Rimpilot
pnpm install
Copy-Item .env.example .env  # PowerShell en Windows
```

1. Crea un proyecto en Supabase y ejecuta todo [packages/backend/src/db/schema.sql](packages/backend/src/db/schema.sql) en el SQL Editor. Ese archivo solo crea estructura: no deja ningún vendedor cargado.
   Si tu proyecto es de antes del retiro personal, corré además [002_retiro_personal.sql](packages/backend/src/db/migrations/002_retiro_personal.sql) una sola vez. Archiva en `movimientos_fiado_archivado` los movimientos de fiado antes de borrarlos: no se convierten a retiro, porque una cuenta por cobrar no es plata que salió de la caja.
2. Completa `DATABASE_URL` y las credenciales de AssemblyAI/Twilio en `.env`. Rellena también `SEED_VENDOR_TELEFONO` (y opcionalmente `SEED_VENDOR_NOMBRE` y `SEED_VENDOR_NEGOCIO`) y crea el vendedor con `pnpm --filter @rimpilot/backend seed`. El script imprime la línea `RIMPILOT_VENDOR_ID=…` que necesitás en el paso siguiente, y falla si le falta el teléfono en lugar de inventar uno.
3. Copia `packages/dashboard/.env.local.example` como `packages/dashboard/.env.local`. Añade ahí `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y el UUID de `RIMPILOT_VENDOR_ID`. El dashboard es de un negocio por despliegue: todas las consultas se limitan a ese UUID y no hay datos de muestra ocultos. Añade también `RIMPILOT_DASHBOARD_USER` y `RIMPILOT_DASHBOARD_PASSWORD` (mínimo 16 caracteres): el panel pide Basic Auth y **sin esas dos variables responde 503**, porque muestra el libro contable y las transcripciones de una persona real.
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

## Desplegarlo

El panel va a Vercel y el backend a Render: sostiene un WebSocket abierto toda
la conversación, y una función serverless se corta antes. Los pasos, las
variables y el aviso del plan gratuito están en
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

Doble clic en [`rimpilot.bat`](rimpilot.bat): trae los ultimos cambios, actualiza
dependencias, revisa que la configuracion este completa y levanta backend y
panel. Si lo dejas suelto en una carpeta vacia, clona el repositorio primero,
asi el mismo archivo sirve para empezar de cero y para ponerte al dia.

## Comandos

```bash
pnpm dev              # backend + dashboard
pnpm dev:backend      # Fastify en :3001
pnpm dev:dashboard    # Next.js en :3000
pnpm typecheck
pnpm lint
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
| `RIMPILOT_INTERNAL_KEY` | Clave servidor-a-servidor con la que el panel pide el token del micrófono. Mínimo 32 caracteres; sin ella `/navegador/token` responde 503. Va también en `packages/dashboard/.env.local`. |
| `RIMPILOT_ORIGENES_PERMITIDOS` | Orígenes que pueden abrir el WebSocket del navegador, separados por coma. Vacío = solo `localhost`. |
| `ASSEMBLYAI_VOICE_URL` | Opcional. Solo para apuntar a un mock en pruebas; vacío usa la API real. |
| `SEED_VENDOR_TELEFONO`, `SEED_VENDOR_NOMBRE`, `SEED_VENDOR_NEGOCIO` | Vendedor inicial para `pnpm --filter @rimpilot/backend seed`. El teléfono es obligatorio; nombre y negocio quedan en `NULL` si no los das. |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RIMPILOT_VENDOR_ID` | Van en `packages/dashboard/.env.local`. El servicio consulta solo ese vendedor y la key nunca se expone al navegador. |
| `RIMPILOT_DASHBOARD_USER`, `RIMPILOT_DASHBOARD_PASSWORD` | Basic Auth del panel, en `packages/dashboard/.env.local`. Obligatorias: sin ellas el panel devuelve 503. |
| `NEXT_PUBLIC_SITE_URL` | URL pública del panel; alimenta metadata, Open Graph y `sitemap.xml`. |
| `RIMPILOT_BACKEND_URL`, `NEXT_PUBLIC_BACKEND_WS_URL` | En `packages/dashboard/.env.local`. La primera la usa el servidor de Next para pedir el token; la segunda la usa el navegador para abrir el WebSocket, y su origen se agrega a `connect-src` de la CSP. |

## Roadmap

Historial verificable y exportable para microfinancieras, conciliación voluntaria de pagos y soporte de lenguas locales. El MVP no ofrece consejo financiero ni toma decisiones de crédito.

## Licencia

[MIT](LICENSE).
