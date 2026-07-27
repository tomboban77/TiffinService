import { redirect } from "next/navigation";
import { db } from "../db/client";
import { getOperatorByAuthUserId } from "./repo/operators";
import { createClient } from "./supabase/server";

/**
 * Resolves the current authenticated user to their operator row. Redirects
 * to /login if unauthenticated, or /onboarding if the auth user has no
 * operator row yet (first login after signup). Call this at the top of
 * every dashboard page/Server Action rather than querying auth + operators
 * separately — it's the one place that guarantees both checks happen.
 */
export async function requireOperator() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const operator = await getOperatorByAuthUserId(db, user.id);
  if (!operator) redirect("/onboarding");

  return operator;
}
