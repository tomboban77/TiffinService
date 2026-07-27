"use server";

import { redirect } from "next/navigation";
import { db } from "../../db/client";
import { createOperator } from "../../lib/repo/operators";
import { upsertSlot } from "../../lib/repo/slots";
import { createClient } from "../../lib/supabase/server";

export async function createOperatorAction(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const businessName = String(formData.get("businessName") ?? "");
  const ownerName = String(formData.get("ownerName") ?? "");
  const timezone = String(formData.get("timezone") ?? "America/Toronto");

  const operator = await createOperator(db, {
    authUserId: user.id,
    businessName,
    ownerName,
    email: user.email ?? "",
    timezone,
  });

  // A single default slot so Settings/Today have something to work with
  // immediately. The full setup wizard (presets, price list, cutoffs,
  // Coexistence connect) is a later milestone — this is just a bootstrap.
  await upsertSlot(db, operator.id, { key: "lunch", label: "Lunch", cutoffTime: "20:00:00", sortOrder: 0 });

  redirect("/today");
}
