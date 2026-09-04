# CLAUDE.md

Memoria del proyecto RIMPILOT. Léela antes de tocar código.

## Estándar de seguridad y calidad

### Seguridad

1. Ningún secreto en el repositorio. Ni credenciales, ni tokens, ni claves de API en el código, en scripts o en el historial de git. Todo va en variables de entorno. Si encontrás un secreto commiteado, avisá de inmediato: además de sacarlo hay que rotarlo, porque ya está en el historial.
2. Ningún valor por defecto en secretos. Un script de seed, de setup o de administración debe fallar si le falta la variable de entorno, nunca caer en una contraseña o un usuario predeterminado.
3. CSP sin `unsafe-inline` ni `unsafe-eval`. Content-Security-Policy con nonce por request y `strict-dynamic`. Con esos dos permisos abiertos, la CSP es decorativa. `unsafe-eval` solo en desarrollo si el hot reload lo exige.
4. Cabeceras de seguridad en todas las respuestas: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictiva y `Strict-Transport-Security` en producción.
5. Verificar la firma de todo webhook entrante, en todos los entornos. No solo en producción: un despliegue de preview accesible desde internet es un entorno real. Saltarse la verificación debe exigir una variable de entorno explícita.
6. Comparar secretos en tiempo constante (`timingSafeEqual`), nunca con `===` o `!==`.
7. Comprobación de propiedad en cada consulta. Toda lectura o escritura de un recurso filtra por el id del usuario dueño. Cambiar un id en la URL no puede devolver datos ajenos (IDOR). Esto es lo que ningún escáner automático detecta: revisalo leyendo el modelo de datos.
8. Validación de entrada en todos los endpoints con un esquema (Zod o equivalente). Nada llega a la base sin validar.
9. Rate limiting en login, registro, recuperación de contraseña y cualquier endpoint que gaste dinero o cuota. Si el almacén es en memoria, tiene que tener tope de tamaño y limpieza de entradas vencidas, y hay que documentar que en serverless no es efectivo entre instancias.
10. Contraseñas con bcrypt/argon2 con costo real (bcrypt cost 12 o superior). Sesión en cookie `httpOnly`, `secure`, `sameSite: strict`, con secreto de firma de 32 caracteres mínimo.
11. OAuth con `state` y PKCE. Sin excepciones.
12. Sin cuentas compartidas ni modo invitado con datos comunes. Si hay acceso sin registro, cada visita recibe su propia cuenta aislada.

### Calidad de cara al usuario

13. Página 404 propia, metatags y meta descripción, imagen Open Graph, favicon, `robots.txt`, `sitemap.xml` y `llms.txt`.
14. Texto alternativo en toda imagen con contenido, y contraste que cumpla WCAG 2.1 AA. Verificalo con axe-core, no a ojo. Si una paleta de marca reprueba contraste, ajustá el tono y explicá por qué.
15. Sourcemaps de producción desactivados.
16. Todo flujo debe funcionar con teclado, con foco visible, y respetar `prefers-reduced-motion`.

### Si el proyecto usa IA

17. Cuotas por usuario y por día, más un tope de llamadas simultáneas, para que un usuario no agote la clave compartida.
18. Verificar lo que el modelo afirma. Si el modelo cita la fuente, esa cita debe existir literalmente en el material; si no, se descarta la salida.
19. Los puntajes y decisiones los calcula el código, no el modelo.
20. Degradación explícita: ante 429 o 503, reintento con un modelo más liviano antes de fallar; y un mensaje de error real, nunca un resultado inventado.

### Proceso de trabajo

21. Diagnóstico primero, cambios después de mi aprobación. Nunca ejecutes una herramienta externa ni apliques cambios masivos sin explicarme antes qué haría y qué riesgo tiene.
22. No toques lo que ya funciona. Si algo está fuera del pedido, mencionalo y seguí.
23. Cambios riesgosos en una rama, nunca directo sobre `main`.
24. Antes de cada push: typecheck, lint y build. Si el cambio es visual, verificalo en el navegador y mostrame la prueba.
25. Nunca apuntes el entorno local a la base de producción. Si ya pasa, avisámelo en cada sesión.

## Herramientas externas de auditoría

Son las herramientas con las que se audita el proyecto. Cada una tiene una condición de uso que ya costó descubrir.

- **Semgrep** — `https://github.com/semgrep/semgrep`
  Análisis estático de seguridad. Es la primera pasada y es gratis. Usar `semgrep scan --config auto`, no `semgrep ci` (ese exige cuenta y está pensado para pipelines). No corre nativo en Windows: hace falta WSL o Docker. `--config auto` envía metadatos del código a los servidores de Semgrep para bajar las reglas; si el repo es sensible, usar un ruleset local. Lo que no puede encontrar: fallos de autorización (IDOR). Eso se revisa a mano leyendo el modelo de datos.

- **Strix** — `https://github.com/usestrix/strix`
  Pentester autónomo con IA: lanza ataques reales (SQLi, XSS, IDOR) y escribe exploits que prueban el hallazgo. Es una categoría más profunda que Semgrep. Condiciones innegociables: solo contra local (`--target ./`), nunca contra la URL de producción; requiere Docker; requiere una API key de pago (una clave gratuita de Gemini no sirve) y cada corrida cuesta dinero real. Si el entorno local comparte base de datos con producción, no correrlo hasta separarlas: un exploit puede borrar o alterar datos reales. Correrlo después de tener la demo grabada, nunca antes.

- **azure-skills** — `https://github.com/microsoft/azure-skills`
  Plugin de Microsoft con 25+ skills para operar recursos de Azure (App Service, AKS, Entra ID, Azure AI). Sirve solo si el proyecto está desplegado en Azure y hay una suscripción activa con `az login`. Gestiona infraestructura, no revisa código. Si el stack es Vercel, Neon, Supabase o similar, no aplica.

- **n8n-skills** — `https://github.com/czlonkowski/n8n-skills`
  Agente para construir flujos de n8n. Solo si el proyecto automatiza con n8n.

- **axe-core + Playwright**
  Auditoría de accesibilidad automatizada: inyectar `axe.min.js` en cada página, recorrer el flujo completo en desktop y móvil, y fallar la corrida ante errores de consola, respuestas HTTP >= 400 o `pageerror`. Dejar capturas en `artifacts/`.

**Regla que aplica a las cuatro:** antes de ejecutar cualquiera de estas herramientas, dar el diagnóstico de qué hace, qué necesita y qué cambiaría. El usuario aprueba.

## Identidad visual

Todo diseño de este proyecto —panel, portadas, slides, imágenes sociales, cualquier
pieza— usa la paleta derivada del logo. Está definida y medida en `DESIGN.md`; esa
es la fuente de verdad, no una aproximación de memoria.

- Fondo navy `#080D1A`, degradado de marca violeta `#8B5CF6` → azul `#3B82F6` → cian `#22D3EE`.
- Cian para lo que entró, rosa `#FB7185` para lo que salió o está por cobrar, siempre
  con signo e ícono además del color (regla 14 y principio de producto).
- El violeta del logo `#8B5CF6` **nunca** lleva texto encima: mide 4.23:1 y reprueba AA.
  Va en degradados y rellenos; para texto violeta, `#A78BFA`.
- Un relleno de marca lleva texto oscuro, nunca blanco: blanco sobre `#3B82F6` es 3.68:1.
- Antes de fijar cualquier color nuevo, medir su contraste contra el fondo real.

## Notas de este proyecto

- **Stack:** monorepo pnpm. `packages/backend` es Fastify (no Next.js): las reglas 3 y 4 se aplican con un hook `onSend`. `packages/dashboard` es Next.js 14 App Router: se aplican en `next.config.mjs` o en `middleware.ts`.
- **No hay sistema de usuarios.** No hay login, sesiones, contraseñas ni OAuth. Las reglas 10, 11 y parte de la 12 no aplican tal cual; su equivalente es el aislamiento por `vendedor_id` (regla 7) y el control de acceso al dashboard.
- **La IA es AssemblyAI Voice Agent API**, no un LLM de texto. Cada llamada telefónica abre una sesión de pago: las reglas 17 y 20 se traducen a tope de sesiones concurrentes y manejo de cierre/rechazo del WebSocket.
- **Regla 25, aviso permanente:** hay un solo proyecto Supabase. El entorno local escribe en la misma base que la demo. Separar antes de correr Strix.
