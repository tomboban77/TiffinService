# Backend conventions

## RLS applies only to the authenticated dashboard session — not to job code

`drizzle/0001_rls_policies.sql` enables Row Level Security on every
tenant-scoped table, gated on `current_operator_id()` (which resolves
`auth.uid()` to an `operators.id`). That function only returns a value when
the connection is authenticated as a real Supabase user — i.e. requests made
through Supabase's PostgREST/Supabase-js path with a user JWT.

**None of our server-side code talks to Postgres that way.** `db/client.ts`
connects directly via `postgres.js` using `DATABASE_URL`. In Supabase, the
direct-connection string authenticates as a role that owns the tables
(`postgres`, or a pooled connection using the service role), and **table
owners bypass RLS by default** (`ALTER TABLE ... FORCE ROW LEVEL SECURITY`
would change that, and we deliberately do not set it). Concretely, RLS
protects only:

- Browser/client code calling Supabase-js directly with the user's session.

RLS does **not** protect, and will silently no-op for:

- Next.js Server Actions and Route Handlers (they use `db/client.ts`).
- Every Inngest function (webhook processing, count locks, billing-day
  jobs, reminders).
- `db/seed.ts`, `scripts/verify-local.ts`, and any other script.

### The convention

**Every query written in server-side code (Server Actions, Route Handlers,
Inngest functions) must filter by `operator_id` explicitly, in the query
itself — never rely on RLS to do it.** There is no database backstop here;
a missing `WHERE operator_id = ...` is a cross-tenant data leak, full stop.

To make this the path of least resistance rather than a thing to remember,
all reads/writes in server code go through the repository functions in
`lib/repo/*.ts`, not through raw `db.select()`/`db.insert()` calls. Every
repository function takes `operatorId` as its first argument (after `db`)
and bakes it into the `where` clause. Application code (Server Actions, page
data loaders, Inngest functions) should never import `db/schema` tables
directly to build ad hoc queries against tenant-scoped tables — call a repo
function, or add one if it doesn't exist yet.

When reviewing a PR that adds a new query against a tenant-scoped table,
check: does it go through `lib/repo/`, and does that repo function filter
by `operatorId`? If either is "no," that's a blocking review comment.
