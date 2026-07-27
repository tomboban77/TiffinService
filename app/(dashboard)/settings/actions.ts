"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../../db/client";
import { requireOperator } from "../../../lib/auth";
import { updateOperatorSettings } from "../../../lib/repo/operators";
import { upsertPriceListItem, setPriceListItemActive } from "../../../lib/repo/priceList";
import { upsertSlot, setSlotActive } from "../../../lib/repo/slots";
import { createPrepaidPlan } from "../../../lib/repo/prepaidPlans";

export async function updateBusinessBasics(formData: FormData) {
  const operator = await requireOperator();
  await updateOperatorSettings(db, operator.id, {
    businessName: String(formData.get("businessName") ?? ""),
    ownerName: String(formData.get("ownerName") ?? ""),
    timezone: String(formData.get("timezone") ?? ""),
    botLanguage: String(formData.get("botLanguage") ?? "en"),
  });
  revalidatePath("/settings");
}

export async function updateBillingConfig(formData: FormData) {
  const operator = await requireOperator();
  const frequency = String(formData.get("billingFrequency") ?? "") || null;
  const dayOfWeekRaw = formData.get("billingDayOfWeek");
  await updateOperatorSettings(db, operator.id, {
    billingFrequency: frequency,
    billingDayOfWeek: dayOfWeekRaw ? Number(dayOfWeekRaw) : null,
    gracePeriodDays: Number(formData.get("gracePeriodDays") ?? 1),
  });
  revalidatePath("/settings");
}

export async function addOrUpdateSlot(formData: FormData) {
  const operator = await requireOperator();
  await upsertSlot(db, operator.id, {
    id: String(formData.get("id") ?? "") || undefined,
    key: String(formData.get("key") ?? ""),
    label: String(formData.get("label") ?? ""),
    cutoffTime: String(formData.get("cutoffTime") ?? "20:00:00"),
  });
  revalidatePath("/settings");
}

export async function toggleSlotActive(slotId: string, active: boolean) {
  const operator = await requireOperator();
  await setSlotActive(db, operator.id, slotId, active);
  revalidatePath("/settings");
}

export async function addOrUpdatePriceListItem(formData: FormData) {
  const operator = await requireOperator();
  await upsertPriceListItem(db, operator.id, {
    id: String(formData.get("id") ?? "") || undefined,
    name: String(formData.get("name") ?? ""),
    priceCents: Math.round(Number(formData.get("priceDollars") ?? 0) * 100),
  });
  revalidatePath("/settings");
}

export async function togglePriceListItemActive(itemId: string, active: boolean) {
  const operator = await requireOperator();
  await setPriceListItemActive(db, operator.id, itemId, active);
  revalidatePath("/settings");
}

export async function addPrepaidPlan(formData: FormData) {
  const operator = await requireOperator();
  await createPrepaidPlan(db, operator.id, {
    name: String(formData.get("name") ?? ""),
    pointsPerRenewal: Number(formData.get("pointsPerRenewal") ?? 0),
    priceCents: Math.round(Number(formData.get("priceDollars") ?? 0) * 100),
    rolloverEnabled: formData.get("rolloverEnabled") === "on",
  });
  revalidatePath("/settings");
}
