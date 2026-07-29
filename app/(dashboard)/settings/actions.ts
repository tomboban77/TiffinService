"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "../../../db/client";
import { isUniqueViolation } from "../../../db/errors";
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
  try {
    await upsertSlot(db, operator.id, {
      id: String(formData.get("id") ?? "") || undefined,
      key: String(formData.get("key") ?? "").trim(),
      label: String(formData.get("label") ?? "").trim(),
      cutoffTime: String(formData.get("cutoffTime") ?? "20:00:00"),
    });
  } catch (err) {
    if (isUniqueViolation(err)) redirect(`/settings?error=${encodeURIComponent("A slot with this key already exists.")}`);
    throw err;
  }
  revalidatePath("/settings");
}

export async function toggleSlotActive(slotId: string, active: boolean) {
  const operator = await requireOperator();
  await setSlotActive(db, operator.id, slotId, active);
  revalidatePath("/settings");
}

export async function addOrUpdatePriceListItem(formData: FormData) {
  const operator = await requireOperator();
  try {
    await upsertPriceListItem(db, operator.id, {
      id: String(formData.get("id") ?? "") || undefined,
      name: String(formData.get("name") ?? "").trim(),
      priceCents: Math.round(Number(formData.get("priceDollars") ?? 0) * 100),
    });
  } catch (err) {
    if (isUniqueViolation(err)) redirect(`/settings?error=${encodeURIComponent("A meal type with this name already exists.")}`);
    throw err;
  }
  revalidatePath("/settings");
}

export async function togglePriceListItemActive(itemId: string, active: boolean) {
  const operator = await requireOperator();
  await setPriceListItemActive(db, operator.id, itemId, active);
  revalidatePath("/settings");
}

export async function addPrepaidPlan(formData: FormData) {
  const operator = await requireOperator();
  try {
    await createPrepaidPlan(db, operator.id, {
      name: String(formData.get("name") ?? "").trim(),
      pointsPerRenewal: Number(formData.get("pointsPerRenewal") ?? 0),
      priceCents: Math.round(Number(formData.get("priceDollars") ?? 0) * 100),
      rolloverEnabled: formData.get("rolloverEnabled") === "on",
    });
  } catch (err) {
    if (isUniqueViolation(err)) redirect(`/settings?error=${encodeURIComponent("A plan with this name already exists.")}`);
    throw err;
  }
  revalidatePath("/settings");
}
