import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { runMigrations } from "../db/runMigrations";
import { ensureTestOperatorAuthUser } from "./support/auth";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Runs once before the whole e2e run. Applies every migration (including RLS
 * — this is a real Supabase project, unlike the PGlite harness) to the
 * dedicated test database, and makes sure the fixed test-operator auth user
 * exists and is email-confirmed. Per-test data (the operator row, slots,
 * price list, customers, ...) is truncated and reseeded per test — see
 * e2e/support/fixtures.ts.
 */
export default async function globalSetup() {
  loadEnv({ path: path.resolve(dirname, "../.env.test") });

  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Copy .env.test.example to .env.test and fill in the dedicated test Supabase project's credentials — this suite must never point at the dev database.",
    );
  }

  console.log("[e2e] applying migrations to the test database...");
  await runMigrations(testDatabaseUrl);

  console.log("[e2e] ensuring the test operator auth user exists...");
  await ensureTestOperatorAuthUser();

  console.log("[e2e] global setup complete.");
}
