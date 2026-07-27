"use server";

import { redirect } from "next/navigation";
import { db } from "../../../../db/client";
import { requireOperator } from "../../../../lib/auth";
import { createCustomer } from "../../../../lib/repo/customers";

export async function createCustomerAction(formData: FormData) {
  const operator = await requireOperator();
  const billingMode = String(formData.get("billingMode") ?? "billed_arrears") as "prepaid" | "billed_arrears";
  const prepaidPlanId = String(formData.get("prepaidPlanId") ?? "");

  const customer = await createCustomer(db, operator.id, {
    name: String(formData.get("name") ?? ""),
    phoneE164: String(formData.get("phoneE164") ?? ""),
    address: String(formData.get("address") ?? "") || null,
    foodNotes: String(formData.get("foodNotes") ?? "") || null,
    billingMode,
    prepaidPlanId: billingMode === "prepaid" && prepaidPlanId ? prepaidPlanId : null,
  });

  redirect(`/customers/${customer.id}`);
}
