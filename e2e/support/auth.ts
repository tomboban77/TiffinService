import { createClient } from "@supabase/supabase-js";

export interface TestOperatorAuthUser {
  id: string;
  email: string;
  password: string;
}

/**
 * Idempotently creates (or looks up) the one auth user every e2e test logs
 * in as. Email/password auth must be enabled on the test Supabase project
 * for sign-in to work — admin.createUser succeeds regardless, but
 * signInWithPassword (what the actual login form calls) will fail if the
 * Email provider is toggled off.
 */
export async function ensureTestOperatorAuthUser(): Promise<TestOperatorAuthUser> {
  const url = process.env.TEST_SUPABASE_URL;
  const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.TEST_OPERATOR_EMAIL;
  const password = process.env.TEST_OPERATOR_PASSWORD;
  if (!url || !serviceRoleKey || !email || !password) {
    throw new Error("TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_ROLE_KEY, TEST_OPERATOR_EMAIL, and TEST_OPERATOR_PASSWORD must all be set in .env.test");
  }

  const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (!createErr && created.user) return { id: created.user.id, email, password };

  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) throw listErr;
  const existing = list.users.find((u) => u.email === email);
  if (!existing) throw new Error(`Could not create or find test operator auth user "${email}": ${createErr?.message}`);
  return { id: existing.id, email, password };
}
