# Desplegar RIMPILOT

Son dos servicios en dos lugares distintos, y no es una elección de gusto.

| Pieza | Dónde | Por qué |
| --- | --- | --- |
| Panel (Next.js) | **Vercel** | Es lo que Vercel hace mejor |
| Backend de voz (Fastify) | **Render** | Sostiene un WebSocket abierto toda la conversación. Las funciones serverless de Vercel se cortan a los segundos, así que ahí el backend **no puede vivir**. |

Dos cosas que rompen el micrófono si se pasan por alto:

- **El panel tiene que estar en HTTPS.** Sin TLS el navegador no entrega el
  micrófono, ni siquiera con permiso concedido. Vercel lo da solo.
- **`NEXT_PUBLIC_BACKEND_WS_URL` se compila dentro del bundle.** Si la cambiás,
  hay que reconstruir el panel; no alcanza con reiniciar.

---

## 0. La base

Si el proyecto de Supabase es de antes de las cuentas, corré
[`003_cuentas.sql`](../packages/backend/src/db/migrations/003_cuentas.sql) en el
SQL Editor. Sin eso la landing carga, pero crear cuenta o entrar como invitado
responde "No pudimos crear la cuenta". Se puede correr más de una vez sin daño.

## 1. Backend en Render

1. [render.com](https://render.com) → **New → Blueprint** → conectá el repo.
   Render lee [`render.yaml`](../render.yaml) y arma el servicio solo.
2. En **Environment**, cargá estas cinco. Ninguna está en el repo:

   | Variable | De dónde sale |
   | --- | --- |
   | `ASSEMBLYAI_API_KEY` | AssemblyAI → Workspace → API Keys |
   | `DATABASE_URL` | Supabase → Connect → **Session pooler** |
   | `STREAM_TOKEN_SECRET` | `openssl rand -base64 32` |
   | `RIMPILOT_INTERNAL_KEY` | `openssl rand -base64 32` |
   | `RIMPILOT_ORIGENES_PERMITIDOS` | La URL del panel (paso 2). Se completa después. |

   **Generá secretos nuevos para producción; no copies los de tu `.env` local.**
   Los que usás en tu computadora pasaron por tu terminal, tu editor y quizás
   alguna captura de pantalla. Los de producción no tienen que haber estado en
   ningún otro lado.

   Los topes de gasto ya vienen cargados en `render.yaml` (5 sesiones a la
   vez, 20 por vendedor por día, 200 por día en total, 10 minutos cada una).
   Con la landing pública y el modo invitado, cualquiera puede abrir una
   sesión: esos números son lo que acota cuánto se gasta de la clave de
   AssemblyAI. Si los cambiás, cambialos a propósito.

   Opcional: `ASSEMBLYAI_VOZ` para otra voz. Vacía usa `lola`. Solo acepta
   nombres del [catálogo](https://www.assemblyai.com/docs/voice-agents/voice-agent-api/voices);
   con uno inventado el backend no arranca, en vez de hablar en inglés.

3. Anotá la URL que te da Render: `https://rimpilot-backend.onrender.com`.

## 2. Panel en Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → importá el repo.
2. **Root Directory: `packages/dashboard`**. Sin eso Vercel construye el
   monorepo entero y falla.
3. Variables de entorno:

   | Variable | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | La secret key de Supabase |
   | `RIMPILOT_SESSION_SECRET` | Mínimo 32 caracteres: `openssl rand -base64 32` |
   | `RIMPILOT_BACKEND_URL` | `https://rimpilot-backend.onrender.com` |
   | `RIMPILOT_INTERNAL_KEY` | **La misma** que en Render |
   | `NEXT_PUBLIC_BACKEND_WS_URL` | `wss://rimpilot-backend.onrender.com/navegador/stream` |
   | `NEXT_PUBLIC_SITE_URL` | La URL que te dé Vercel |

   Ojo con el `wss://`, no `ws://`: desde una página HTTPS un WebSocket sin
   cifrar queda bloqueado.

4. **Node 22.x** en Settings → General. pnpm 11, el que fija el repo, no corre
   en versiones anteriores. Si el build falla con un error de pnpm, agregá
   también la variable `ENABLE_EXPERIMENTAL_COREPACK=1`: hace que Vercel use
   exactamente la versión de `packageManager` y no la suya.

## 3. Cerrar el círculo

Volvé a Render y poné en `RIMPILOT_ORIGENES_PERMITIDOS` la URL del panel, sin
barra final:

```
https://rimpilot.vercel.app
```

Vacía, el backend solo acepta `localhost` y el panel desplegado no puede abrir
la sesión de voz.

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
| El libro responde 503 | Falta `RIMPILOT_SESSION_SECRET` en Vercel, o tiene menos de 32 caracteres |
| El micrófono no arranca y la consola muestra un bloqueo de CSP | `NEXT_PUBLIC_BACKEND_WS_URL` no coincide con el backend real, o se cambió sin reconstruir |
| "El backend de voz rechazó la sesión" | `RIMPILOT_INTERNAL_KEY` distinta en Vercel y en Render |
| Conecta y se corta enseguida | Falta la URL del panel en `RIMPILOT_ORIGENES_PERMITIDOS` (paso 3) |
| Wari habla pero no anota | Mirá el log de Render: cada herramienta que pide aparece como "Wari pidió una herramienta" |

---

## Antes de mostrárselo al jurado

**El plan gratuito de Render duerme el servicio tras ~15 minutos sin uso**, y
despertarlo tarda cerca de un minuto. Si el jurado es el primero en tocar el
botón en horas, se va a quedar mirando una pantalla quieta.

Dos formas de evitarlo, y conviene hacer las dos:

- **Abrí el panel y hablá una vez, cinco minutos antes.** Gratis y suficiente.
- Si querés no depender de eso, el plan de US$ 7/mes de Render no duerme.

Lo mismo antes de grabar el video.
