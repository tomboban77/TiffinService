import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// idle_timeout releases connections back to the session-mode pooler instead
// of holding them open indefinitely — without it, a long-lived process (dev
// server, e2e webServer) accumulates connections across requests until it
// hits the pooler's hard cap (Supabase's session pooler caps concurrent
// connections per project; we hit this for real running the e2e suite).
const client = postgres(connectionString, { prepare: false, idle_timeout: 20 });
export const db = drizzle(client, { schema });
