"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "../../../../db/client";
import { requireOperator } from "../../../../lib/auth";
import { updateCustomer } from "../../../../lib/repo/customers";
import { createStandingOrder } from "../../../../lib/repo/standingOrders";
import { createAdjustmentBatch } from "../../../../lib/repo/adjustments";
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

const MAX_ADJUSTMENT_RANGE_DAYS = 62;

function enumerateDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || cursor > end) {
    throw new Error("Invalid date range");
  }
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 86_400_000);
    if (dates.length > MAX_ADJUSTMENT_RANGE_DAYS) throw new Error(`Date range too long (max ${MAX_ADJUSTMENT_RANGE_DAYS} days)`);
  }
  return dates;
}

export async function addAdjustment(customerId: string, formData: FormData) {
  const operator = await requireOperator();
  const standingOrderId = String(formData.get("standingOrderId") ?? "") || null;
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "") || startDate;
  if (!startDate) throw new Error("A date is required");

  const priceList = await listPriceListItems(db, operator.id);
  const items = priceList
    .map((item) => ({ priceListItemId: item.id, raw: formData.get(`qty-${item.id}`) }))
    .filter(({ raw }) => raw !== null && String(raw).trim() !== "")
    .map(({ priceListItemId, raw }) => ({ priceListItemId, quantity: Number(raw) }));

  if (items.length === 0) throw new Error("Set at least one meal type to skip (0) or override (a quantity)");

  const dates = enumerateDates(startDate, endDate);
  for (const effectiveDate of dates) {
    await createAdjustmentBatch(db, operator.id, {
      customerId,
      standingOrderId,
      effectiveDate,
      items,
      source: "operator",
      note: "Added from the customer detail page",
    });
  }

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
