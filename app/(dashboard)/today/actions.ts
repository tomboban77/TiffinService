"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "../../../db/client";
import { requireOperator } from "../../../lib/auth";
import { markDelivered, markNotDelivered, StaleRouteStopError } from "../../../lib/repo/routeStops";
import { createClosure } from "../../../lib/repo/closures";

export async function markDeliveredAction(routeStopId: string, date: string) {
  const operator = await requireOperator();
  try {
    await markDelivered(db, operator.id, routeStopId, operator.timezone, {});
  } catch (err) {
    if (err instanceof StaleRouteStopError) redirect(`/today?date=${date}&error=${encodeURIComponent(err.message)}`);
    throw err;
  }
  revalidatePath("/today");
}

export async function markNotDeliveredAction(routeStopId: string, date: string, formData: FormData) {
  const operator = await requireOperator();
  const note = String(formData.get("note") ?? "");
  if (!note.trim()) throw new Error("A note is required to mark a delivery not-delivered");

  try {
    await markNotDelivered(db, operator.id, routeStopId, operator.timezone, {
      chargeOnFail: formData.get("chargeOnFail") === "on",
      note,
    });
  } catch (err) {
    if (err instanceof StaleRouteStopError) redirect(`/today?date=${date}&error=${encodeURIComponent(err.message)}`);
    throw err;
  }
  revalidatePath("/today");
}

export async function closeDayAction(date: string, formData: FormData) {
  const operator = await requireOperator();
  await createClosure(db, operator.id, date, String(formData.get("reason") ?? "") || undefined);
  revalidatePath("/today");
}
