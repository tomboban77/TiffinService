import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema";

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) {
  throw new Error("TEST_DATABASE_URL is not set — copy .env.test.example to .env.test and fill in the dedicated test project");
}

const client = postgres(connectionString, {
  prepare: false,
  max: 3,
  idle_timeout: 20,
  onnotice: () => {}, // silence the "truncate cascades to table X" NOTICE spam between every test
});
export const testDb = drizzle(client, { schema });

/**
 * Wipes all tenant data between tests. Safe because every tenant table's
 * operator_id FK is declared onDelete: cascade (see db/schema/operators.ts),
 * so truncating operators alone cascades through the whole graph. Never run
 * this against anything but the dedicated test project.
 */
export async function resetTestDb() {
  await client`truncate table operators cascade`;
}
