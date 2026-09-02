import "./env.js";
import Fastify from "fastify";
import formbody from "@fastify/formbody";
import { twilioRoutes } from "./routes/twilio.js";
import { streamRoutes } from "./routes/stream.js";

const app = Fastify({ logger: true });

/**
 * Regla 4 en Fastify: el backend solo devuelve TwiML y JSON, así que la CSP se
 * limita a bloquear todo (no sirve documentos navegables) y el resto de las
 * cabeceras van en cada respuesta, no solo en producción.
 */
app.addHook("onSend", (_peticion, respuesta, payload, done) => {
  respuesta.header("X-Content-Type-Options", "nosniff");
  respuesta.header("X-Frame-Options", "DENY");
  respuesta.header("Referrer-Policy", "strict-origin-when-cross-origin");
  respuesta.header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()");
  respuesta.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  if (process.env.NODE_ENV === "production") {
    respuesta.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  done(null, payload);
});

await app.register(formbody);
await app.register(twilioRoutes, { prefix: "/twilio" });
await app.register(streamRoutes, { prefix: "/twilio" });
app.get("/health", () => ({ ok: true, service: "rimpilot-backend" }));

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: "0.0.0.0" });
