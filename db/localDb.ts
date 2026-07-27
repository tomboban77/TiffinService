import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";

/**
 * Spins up an in-memory Postgres (via PGlite) and applies the schema and
 * billing-cycle-immutability migrations. Used by the seed-verification
 * script and by tests that want to exercise real constraints (composite
 * FKs, unique/idempotency constraints, immutability triggers) without a
 * live Supabase instance.
 *
 * Deliberately skips 0001_rls_policies.sql: RLS policies call auth.uid(),
 * which only exists inside Supabase. RLS is exercised against a real
 * Supabase project, not this local harness.
 */
export async function createLocalDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  const journal = JSON.parse(
    readFileSync(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf-8"),
  ) as { entries: { tag: string }[] };

  // Skip the rls_policies entry — everything else applies in order.
  for (const entry of journal.entries) {
    if (entry.tag.includes("rls_policies")) continue;
    const sql = readFileSync(new URL(`../drizzle/${entry.tag}.sql`, import.meta.url), "utf-8");
    await client.exec(stripBreakpoints(sql));
  }

  return { client, db };
}

function stripBreakpoints(sql: string): string {
  return sql.replaceAll("--> statement-breakpoint", "");
}
