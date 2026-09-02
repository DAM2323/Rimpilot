import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const candidates = [
  process.env.ENV_FILE,
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
].filter((path): path is string => Boolean(path));

const envFile = candidates.find((path) => existsSync(path));
if (envFile) dotenv.config({ path: envFile });
