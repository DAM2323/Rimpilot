# Desplegar RIMPILOT

Todo va a **Render**, con un solo Blueprint ([`render.yaml`](../render.yaml))
que crea los dos servicios:

| Servicio | Qué es | URL esperada |
| --- | --- | --- |
| `rimpilot` | El panel (Next.js) | `https://rimpilot.onrender.com` |
| `rimpilot-backend` | El backend de voz (Fastify) | `https://rimpilot-backend.onrender.com` |

El backend no puede ir a una plataforma serverless: sostiene un WebSocket
abierto toda la conversación y necesita un proceso vivo. Render sirve para los
dos, así que todo queda en un solo lugar.

Dos cosas que rompen el micrófono si se pasan por alto:

- **El panel tiene que estar en HTTPS.** Sin TLS el navegador no entrega el
  micrófono. Render lo da solo.
- **`NEXT_PUBLIC_BACKEND_WS_URL` se compila dentro del bundle.** Si la cambiás,
  hay que volver a desplegar el panel; no alcanza con reiniciarlo.

**Regla 25:** hay un solo proyecto de Supabase. Lo desplegado escribe en la
misma base que tu entorno local.

---

## 0. La base

Si el proyecto de Supabase es de antes de las cuentas, corré
[`003_cuentas.sql`](../packages/backend/src/db/migrations/003_cuentas.sql) en el
SQL Editor. Sin eso la landing carga, pero crear cuenta o entrar como invitado
responde "No pudimos crear la cuenta". Se puede correr más de una vez sin daño.

## 1. Crear el Blueprint

1. [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint** →
   elegí el repo `Rimpilot`, rama `main`.
2. Render muestra los dos servicios y te pide **cuatro** valores. Pegalos ahí,
   en Render; ninguno va al repo ni al chat:

   | Servicio | Variable | De dónde sale |
   | --- | --- | --- |
   | `rimpilot-backend` | `ASSEMBLYAI_API_KEY` | AssemblyAI → API Keys. **Usá una clave nueva**, no la que estuvo en tu `.env` |
   | `rimpilot-backend` | `DATABASE_URL` | Supabase → Connect → **Session pooler** |
   | `rimpilot` | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
   | `rimpilot` | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → secret key |

3. **Apply.** El resto ya viene resuelto en `render.yaml`:
   - `STREAM_TOKEN_SECRET`, `RIMPILOT_INTERNAL_KEY` y `RIMPILOT_SESSION_SECRET`
     los genera Render (256 bits aleatorios). La clave interna del panel se toma
     del backend, así que siempre coinciden.
   - Las URLs cruzadas (`RIMPILOT_BACKEND_URL`, `NEXT_PUBLIC_BACKEND_WS_URL`,
     `NEXT_PUBLIC_SITE_URL`, `RIMPILOT_ORIGENES_PERMITIDOS`).
   - Los topes de gasto: 5 sesiones a la vez, 20 por vendedor por día, 200 por
     día en total, 10 minutos cada una. Con la landing pública y el modo
     invitado cualquiera puede abrir una sesión: esos números acotan cuánto se
     gasta de la clave de AssemblyAI.

   Opcional: `ASSEMBLYAI_VOZ` en el backend para otra voz. Vacía usa `lola`.
   Solo acepta nombres del [catálogo](https://www.assemblyai.com/docs/voice-agents/voice-agent-api/voices).

El primer build tarda unos minutos por servicio.

## 2. Si Render cambió una URL

Si `rimpilot` o `rimpilot-backend` ya estaban tomados, Render agrega un sufijo
(`rimpilot-x1y2.onrender.com`). Mirá la URL real de cada servicio y, si no
coincide con la de la tabla de arriba:

- En `rimpilot-backend` → Environment: `RIMPILOT_ORIGENES_PERMITIDOS` = URL del
  panel, sin barra final.
- En `rimpilot` → Environment: `RIMPILOT_BACKEND_URL`,
  `NEXT_PUBLIC_BACKEND_WS_URL` (con `wss://` y `/navegador/stream` al final) y
  `NEXT_PUBLIC_SITE_URL`. Después **Manual Deploy**, porque las `NEXT_PUBLIC_*`
  se compilan.

## 3. Alternativa: el panel en Vercel

Si preferís el panel en Vercel, borrá el servicio `rimpilot` de Render e
importá el repo en Vercel con **Root Directory `packages/dashboard`**, Node
22.x y las mismas variables del panel. `RIMPILOT_INTERNAL_KEY` tiene que ser
**la misma** que la del backend (copiala desde Render → Environment), y
`RIMPILOT_ORIGENES_PERMITIDOS` en el backend pasa a ser la URL de Vercel.

## 3b. Teléfono (opcional)

El micrófono del navegador alcanza para la demo. Si además querés recibir
llamadas, agregá en Render:

| Variable | Valor |
| --- | --- |
| `PUBLIC_URL` | La URL de Render, `https://rimpilot-backend.onrender.com` |
| `TWILIO_AUTH_TOKEN` | Twilio → Console → Account Info |

Y en el número de Twilio, **A call comes in** → `POST https://rimpilot-backend.onrender.com/twilio/voice`.

La firma de Twilio se verifica siempre y no hay forma de saltearla: sin
`TWILIO_AUTH_TOKEN` el webhook responde 403 a todo. Quien llama tiene un libro
propio, identificado por su número; todavía no se puede unir con una cuenta
creada en la web.

## 4. Comprobar

```bash
curl https://rimpilot-backend.onrender.com/health
```

Después abrí el panel, tocá **Probar sin registrarme** y después **Hablar con
Wari**. Decí «vendí diez polos a cincuenta soles»: tiene que aparecer escrito lo
que dijiste, lo que contesta Wari, y la fila en Movimientos sin recargar.

Si algo falla, en este orden:

| Síntoma | Causa probable |
| --- | --- |
| "No pudimos crear la cuenta" | Falta correr `003_cuentas.sql` (paso 0) |
| El libro responde 503 | Falta `RIMPILOT_SESSION_SECRET` en el panel, o tiene menos de 32 caracteres |
| El micrófono no arranca y la consola muestra un bloqueo de CSP | `NEXT_PUBLIC_BACKEND_WS_URL` no coincide con el backend real, o se cambió sin reconstruir |
| "El backend de voz rechazó la sesión" | `RIMPILOT_INTERNAL_KEY` distinta en el panel y en el backend |
| Conecta y se corta enseguida | La URL del panel no está en `RIMPILOT_ORIGENES_PERMITIDOS` (paso 2) |
| Wari habla pero no anota | Mirá el log de Render: cada herramienta que pide aparece como "Wari pidió una herramienta" |

---

## Antes de mostrárselo al jurado

**El plan gratuito de Render duerme cada servicio tras ~15 minutos sin uso**, y
despertarlo tarda cerca de un minuto. Son dos: el panel y el backend. Si el jurado es el primero en tocar el
botón en horas, se va a quedar mirando una pantalla quieta.

Dos formas de evitarlo, y conviene hacer las dos:

- **Abrí el panel y hablá una vez, cinco minutos antes.** Despierta a los dos. Gratis y suficiente.
- Si querés no depender de eso, el plan de US$ 7/mes de Render no duerme.

Lo mismo antes de grabar el video.
