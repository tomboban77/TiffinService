# Tiffin Service

A WhatsApp-native tiffin/kitchen service management platform. See `docs/BACKEND_CONVENTIONS.md`
for the Row Level Security / service-role convention that all server-side query code must follow.

## Stack

Next.js (App Router, TypeScript) · Tailwind CSS · Supabase (Postgres, Auth, RLS) · Drizzle ORM ·
Inngest (background jobs, not yet wired) · Meta WhatsApp Cloud API (not yet wired) · Stripe (not yet wired)

## First run

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com) (or run `supabase start` locally with the
Supabase CLI, if you prefer a local stack). You'll need three values from **Project Settings → API**
and one from **Project Settings → Database**:

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `anon` `public` key
- `SUPABASE_SERVICE_ROLE_KEY` — `service_role` key (used later for Inngest/webhook jobs; not required
  for the milestone-2 app itself, but wire it in now)
- `DATABASE_URL` — Project Settings → Database → Connection string → **URI** (use the "Session pooler"
  or direct connection string, not the transaction pooler — Drizzle's migrator needs a plain session)

Enable **Email** auth under Authentication → Providers (on by default). Email confirmations are on by
default too; either disable "Confirm email" for local testing (Authentication → Providers → Email) or
check your inbox after signing up.

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in the four values above in `.env.local`. This file is gitignored — never commit it.

`npm run db:migrate` and `npm run db:seed` load `.env.local` themselves (via `db/env.ts`), so you don't
need to export `DATABASE_URL` into your shell session manually. `npm run verify:local` never touches
`.env.local` at all — it runs entirely against an in-memory PGlite instance.

### 3. Install dependencies

```bash
npm install
```

### 4. Run migrations

```bash
npm run db:migrate
```

This applies, in order: the full schema (`0000_*.sql`), the RLS policies (`0001_rls_policies.sql` —
requires Supabase's `auth` schema, so this step only works against a real Supabase database, not a
generic Postgres instance), and the billing-cycle immutability triggers (`0002_*.sql`).

### 5. Seed example data (optional)

```bash
npm run db:seed
```

Creates one operator ("Riverside Home Kitchen") with four customers demonstrating all three billing
models: prepaid/rollover, prepaid/expire-at-cycle-end, billed-arrears/weekly-tab, and
billed-arrears/weekly-batch. See `db/seedData.ts` for the exact shape.

The auth user this seed data attaches to (`authUserId: "00000000-0000-0000-0000-000000000001"`) doesn't
exist in Supabase Auth yet — it's meant for exercising the repo/billing layer directly, not for logging
into the dashboard. To log in and see data in the UI, sign up through the app (step 6) and either seed
against *that* auth user's id, or use the `/onboarding` bootstrap screen to create your own operator row.

### 6. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000`, sign up with an email/password, and you'll land on `/onboarding` — a
minimal bootstrap (business name, your name, timezone) that creates your operator row. The full setup
wizard (presets, price list, cutoffs, WhatsApp Coexistence connect) is a later milestone; for now, fill
in the rest under **Settings**.

## Verifying changes without a live database

`npm run verify:local` spins up an in-memory Postgres (via PGlite, a WASM build) and applies the schema
+ trigger migrations for real, then seeds all three billing models and asserts on the computed numbers,
the immutability triggers, the idempotency constraints, and cross-tenant composite-FK enforcement. It
skips the RLS migration (no `auth.uid()` outside Supabase). Run this — and `npm test` and
`npm run typecheck` — before committing anything that touches `db/schema`, `lib/billing`, or `lib/repo`.

```bash
npm run typecheck
npm test
npm run verify:local
```

All three run in CI on every push (`.github/workflows/ci.yml`).

## Project layout

```
db/schema/       Drizzle table definitions (source of truth for the data model)
drizzle/         Generated SQL migrations + two hand-written ones (RLS, immutability triggers)
lib/billing/     Pure, DB-free functions for count/settlement/points math (unit tested)
lib/repo/        The only sanctioned way to query tenant-scoped tables from server code —
                 every function takes operatorId explicitly (see docs/BACKEND_CONVENTIONS.md)
lib/supabase/    Auth client helpers (browser, server, middleware)
app/             Next.js App Router pages — (dashboard) group is the authenticated app
tests/           Vitest unit tests for lib/billing
scripts/         verify-local.ts — the PGlite end-to-end check described above
```
