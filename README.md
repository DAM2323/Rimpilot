# RIMPILOT

**Contabilidad por voz para vendedores informales.** Una persona llama, le cuenta sus ventas, gastos o fiados a Wari en lenguaje natural, y RIMPILOT los organiza en un libro contable que se ve al instante en el dashboard.

RIMPILOT fue creado desde cero para el AssemblyAI Voice Agent Hackathon 2026. El MVP no evalúa crédito ni se conecta a bancos: crea el historial ordenado que puede habilitar eso en el futuro.

## Qué incluye

- Llamada entrante por Twilio Media Streams.
- Puente de audio G.711 μ-law (`audio/pcmu`) con AssemblyAI Voice Agent API, sin recodificar audio.
- Wari, agente conversacional en español con cuatro herramientas: venta, gasto, cuenta por cobrar y resumen diario.
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

1. Crea un proyecto en Supabase y ejecuta todo [packages/backend/src/db/schema.sql](packages/backend/src/db/schema.sql) en el SQL Editor.
2. Completa `DATABASE_URL` y las credenciales de AssemblyAI/Twilio en `.env`.
3. Copia `packages/dashboard/.env.local.example` como `packages/dashboard/.env.local`. Añade ahí `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y el UUID de `RIMPILOT_VENDOR_ID`. El dashboard es de un negocio por despliegue: todas las consultas se limitan a ese UUID y no hay datos de muestra ocultos. Añade también `RIMPILOT_DASHBOARD_USER` y `RIMPILOT_DASHBOARD_PASSWORD` (mínimo 16 caracteres): el panel pide Basic Auth y **sin esas dos variables responde 503**, porque muestra el libro contable y las transcripciones de una persona real.
4. Arranca el backend y abre un túnel público:

```bash
pnpm dev:backend
ngrok http 3001
```

5. Copia la URL HTTPS de ngrok a `PUBLIC_URL` (por ejemplo, `https://abc.ngrok.app`) y reinicia el backend. En el número de Twilio configura **A call comes in** como `POST https://abc.ngrok.app/twilio/voice`.
6. En otra terminal inicia el dashboard con `pnpm dev:dashboard` y abre `http://localhost:3000`.

Si faltan variables del dashboard, el panel muestra ceros y una advertencia de configuración; nunca simula datos contables.

## Comprobar el audio antes de la demo

Haz esta comprobación antes de probar lógica contable:

1. Llama al número de Twilio y verifica que escuchas el saludo de Wari.
2. Di una frase corta y confirma en los logs del backend `Wari listo para recibir audio` y eventos de la sesión.
3. Interrumpe a Wari mientras habla; el audio debe detenerse de inmediato (Twilio recibe `clear`).
4. Recién entonces prueba movimientos. El bridge usa el mismo códec μ-law 8 kHz que Twilio y AssemblyAI, por lo que los payloads se reenvían como Base64 sin pérdida por conversión.

## Demo reproducible

Sigue el [guion de demo](docs/demo-script.md):

> “Vendí tres pollos a veinticinco soles cada uno, me pagaron por Yape. Gasté quince en pasaje y a Doña Rosa le fié veinte.”

Wari registra tres movimientos y, al cerrar, resume ventas `S/ 75`, gastos `S/ 15`, caja `S/ 60` y `S/ 20` por cobrar. El dashboard muestra cada entrada y su transcripción de origen.

## Arquitectura

```text
Teléfono → Twilio Media Streams → Fastify → AssemblyAI Voice Agent API
                                        ↘ PostgreSQL / Supabase → Next.js dashboard
```

`packages/backend` contiene el puente de voz y las reglas de negocio. `packages/dashboard` contiene el libro contable. La base de datos vive en Supabase y usa PostgreSQL directamente desde el backend.

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
| `MAX_LLAMADAS_CONCURRENTES` | Tope de sesiones simultáneas de AssemblyAI. Por defecto 5. |
| `ASSEMBLYAI_VOICE_URL` | Opcional. Solo para apuntar a un mock en pruebas; vacío usa la API real. |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RIMPILOT_VENDOR_ID` | Van en `packages/dashboard/.env.local`. El servicio consulta solo ese vendedor y la key nunca se expone al navegador. |
| `RIMPILOT_DASHBOARD_USER`, `RIMPILOT_DASHBOARD_PASSWORD` | Basic Auth del panel, en `packages/dashboard/.env.local`. Obligatorias: sin ellas el panel devuelve 503. |
| `NEXT_PUBLIC_SITE_URL` | URL pública del panel; alimenta metadata, Open Graph y `sitemap.xml`. |

## Roadmap

Historial verificable y exportable para microfinancieras, conciliación voluntaria de pagos y soporte de lenguas locales. El MVP no ofrece consejo financiero ni toma decisiones de crédito.

## Licencia

[MIT](LICENSE).
