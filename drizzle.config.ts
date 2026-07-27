import "dotenv/config";
import type { Config } from "drizzle-kit";

export default {
  schema: "./db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:54322/postgres",
  },
} satisfies Config;
