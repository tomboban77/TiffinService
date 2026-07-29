import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

const dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(dirname, ".env.test") });

const PORT = process.env.E2E_PORT ?? "3100";
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Tests truncate a shared test database between runs — parallel workers
  // would stomp on each other's fixtures.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    ...devices["Pixel 5"], // mobile-first product — the operator is standing in a kitchen
  },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Deliberately override, never inherit .env.local — this must never run
      // against the real dev database. db/env.ts won't clobber these because
      // it only fills in vars that aren't already set.
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      NEXT_PUBLIC_SUPABASE_URL: process.env.TEST_SUPABASE_URL ?? "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.TEST_SUPABASE_ANON_KEY ?? "",
      SUPABASE_SERVICE_ROLE_KEY: process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ?? "",
    },
  },
});
