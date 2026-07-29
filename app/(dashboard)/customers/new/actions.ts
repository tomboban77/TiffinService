"use server";

import { redirect } from "next/navigation";
import { db } from "../../../../db/client";
import { isUniqueViolation } from "../../../../db/errors";
import { requireOperator } from "../../../../lib/auth";
import { createCustomer } from "../../../../lib/repo/customers";
import { normalizePhoneE164 } from "../../../../lib/phone";

export async function createCustomerAction(formData: FormData) {
  const operator = await requireOperator();
  const billingMode = String(formData.get("billingMode") ?? "billed_arrears") as "prepaid" | "billed_arrears";
  const prepaidPlanId = String(formData.get("prepaidPlanId") ?? "");

  let phoneE164: string;
  try {
    phoneE164 = normalizePhoneE164(String(formData.get("phoneE164") ?? ""));
  } catch {
    redirect(`/customers/new?error=${encodeURIComponent("That phone number doesn't look valid. Include a country code if it's not Canadian.")}`);
  }

  let customer;
  try {
    customer = await createCustomer(db, operator.id, {
      name: String(formData.get("name") ?? ""),
      phoneE164,
      address: String(formData.get("address") ?? "") || null,
      foodNotes: String(formData.get("foodNotes") ?? "") || null,
      billingMode,
      prepaidPlanId: billingMode === "prepaid" && prepaidPlanId ? prepaidPlanId : null,
    });
  } catch (err) {
    if (isUniqueViolation(err)) redirect(`/customers/new?error=${encodeURIComponent("A customer with this phone number already exists.")}`);
    throw err;
  }

  redirect(`/customers/${customer.id}`);
}
