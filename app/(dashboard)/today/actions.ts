"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../../db/client";
import { requireOperator } from "../../../lib/auth";
import { markDelivered, markNotDelivered } from "../../../lib/repo/routeStops";
import { createClosure } from "../../../lib/repo/closures";

export async function markDeliveredAction(routeStopId: string) {
  const operator = await requireOperator();
  await markDelivered(db, operator.id, routeStopId, operator.timezone, {});
  revalidatePath("/today");
}

export async function markNotDeliveredAction(routeStopId: string, formData: FormData) {
  const operator = await requireOperator();
  const note = String(formData.get("note") ?? "");
  if (!note.trim()) throw new Error("A note is required to mark a delivery not-delivered");

  await markNotDelivered(db, operator.id, routeStopId, operator.timezone, {
    chargeOnFail: formData.get("chargeOnFail") === "on",
    note,
  });
  revalidatePath("/today");
}

export async function closeDayAction(date: string, formData: FormData) {
  const operator = await requireOperator();
  await createClosure(db, operator.id, date, String(formData.get("reason") ?? "") || undefined);
  revalidatePath("/today");
}
