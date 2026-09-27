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

## 3. Cerrar el círculo

Volvé a Render y poné en `RIMPILOT_ORIGENES_PERMITIDOS` la URL del panel, sin
barra final:

```
https://rimpilot.vercel.app
```

Vacía, el backend solo acepta `localhost` y el panel desplegado no puede abrir
la sesión de voz.

## 4. Comprobar

```bash
curl https://rimpilot-backend.onrender.com/health
```

Después abrí el panel, iniciá sesión y tocá **Hablar con Wari**. Si el micrófono
no arranca, mirá la consola del navegador: un bloqueo de CSP significa que
`NEXT_PUBLIC_BACKEND_WS_URL` no coincide con el backend real.

---

## Antes de mostrárselo al jurado

**El plan gratuito de Render duerme el servicio tras ~15 minutos sin uso**, y
despertarlo tarda cerca de un minuto. Si el jurado es el primero en tocar el
botón en horas, se va a quedar mirando una pantalla quieta.

Dos formas de evitarlo, y conviene hacer las dos:

- **Abrí el panel y hablá una vez, cinco minutos antes.** Gratis y suficiente.
- Si querés no depender de eso, el plan de US$ 7/mes de Render no duerme.

Lo mismo antes de grabar el video.
