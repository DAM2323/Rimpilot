import dotenv from "dotenv";
import Fastify from "fastify";
import formbody from "@fastify/formbody";
import { twilioRoutes } from "./routes/twilio.js";
import { streamRoutes } from "./routes/stream.js";

dotenv.config({ path: process.env.ENV_FILE ?? "../../.env" });

const app = Fastify({ logger: true });
await app.register(formbody);
await app.register(twilioRoutes, { prefix: "/twilio" });
await app.register(streamRoutes, { prefix: "/twilio" });
app.get("/health", async () => ({ ok: true, service: "rimpilot-backend" }));

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: "0.0.0.0" });
