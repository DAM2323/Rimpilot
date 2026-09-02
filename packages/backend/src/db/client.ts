import postgres from "postgres";

let client: ReturnType<typeof postgres> | null = null;

/** Opens the database only when a request actually needs it. */
export function sql() {
  if (client) return client;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL es obligatoria para usar la base de datos.");
  client = postgres(databaseUrl, { max: 10, idle_timeout: 20, connect_timeout: 10 });
  return client;
}
