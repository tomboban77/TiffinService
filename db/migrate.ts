import "./env";
import { runMigrations } from "./runMigrations";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  console.log("Running migrations against", connectionString.replace(/:[^:@]+@/, ":****@"));
  await runMigrations(connectionString);
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
