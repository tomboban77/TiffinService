"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "../../../../db/client";
import { requireOperator } from "../../../../lib/auth";
import { updateCustomer } from "../../../../lib/repo/customers";
import { createStandingOrder } from "../../../../lib/repo/standingOrders";
import { createAdjustment } from "../../../../lib/repo/adjustments";
import { manualPointsAdjustment } from "../../../../lib/repo/points";
import { listPriceListItems } from "../../../../lib/repo/priceList";

export async function updateCustomerDetails(customerId: string, formData: FormData) {
  const operator = await requireOperator();
  await updateCustomer(db, operator.id, customerId, {
    name: String(formData.get("name") ?? ""),
    phoneE164: String(formData.get("phoneE164") ?? ""),
    address: String(formData.get("address") ?? "") || null,
    foodNotes: String(formData.get("foodNotes") ?? "") || null,
  });
  revalidatePath(`/customers/${customerId}`);
}

export async function addStandingOrder(customerId: string, formData: FormData) {
  const operator = await requireOperator();
  const priceList = await listPriceListItems(db, operator.id);

  const dayPattern = priceList.length
    ? [0, 1, 2, 3, 4, 5, 6].filter((d) => formData.get(`day-${d}`) === "on")
    : [];

  const items = priceList
    .map((item) => ({ priceListItemId: item.id, quantity: Number(formData.get(`qty-${item.id}`) ?? 0) }))
    .filter((item) => item.quantity > 0);

  await createStandingOrder(db, operator.id, {
    customerId,
    slotId: String(formData.get("slotId") ?? ""),
    dayPattern,
    cadence: (String(formData.get("cadence") ?? "per_day") as "per_day" | "batch"),
    periodDays: formData.get("cadence") === "batch" ? Number(formData.get("periodDays") ?? 7) : null,
    deliveryMethod: String(formData.get("deliveryMethod") ?? "delivery") as "delivery" | "pickup",
    items,
  });

  revalidatePath(`/customers/${customerId}`);
}

export async function skipDay(customerId: string, formData: FormData) {
  const operator = await requireOperator();
  const standingOrderId = String(formData.get("standingOrderId") ?? "");
  const date = String(formData.get("date") ?? "");

  await createAdjustment(db, operator.id, {
    customerId,
    standingOrderId: standingOrderId || null,
    effectiveDate: date,
    kind: "skip",
    source: "operator",
    note: "Marked from the customer detail page",
  });

  revalidatePath(`/customers/${customerId}`);
}

export async function adjustPoints(customerId: string, formData: FormData) {
  const operator = await requireOperator();
  const delta = Number(formData.get("delta") ?? 0);
  const note = String(formData.get("note") ?? "");
  if (!note.trim()) throw new Error("A note is required for a manual points adjustment");

  await manualPointsAdjustment(db, operator.id, customerId, delta, note, randomUUID());
  revalidatePath(`/customers/${customerId}`);
}
