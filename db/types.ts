import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

/** Accepts either the production (postgres-js) or local verification (PGlite) driver. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
