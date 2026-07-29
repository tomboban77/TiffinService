import { config } from "dotenv";

// Next.js loads .env.local automatically; standalone scripts (tsx) don't, so
// mirror that precedence here. dotenv never overwrites a key that's already
// set, so loading .env.local first (before .env) gives it priority without
// needing `override: true` — which would otherwise clobber variables
// intentionally injected via the real process environment (e.g. Playwright's
// webServer env pointing e2e runs at a dedicated test database).
config({ path: ".env.local" });
config({ path: ".env" });
