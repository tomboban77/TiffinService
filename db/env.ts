import { config } from "dotenv";

// Next.js loads .env.local automatically; standalone scripts (tsx) don't, so
// mirror that precedence here — .env as a base, .env.local overriding it.
config({ path: ".env" });
config({ path: ".env.local", override: true });
