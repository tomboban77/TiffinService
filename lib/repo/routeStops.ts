import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/types";
import { routeStops, deliveryLedger, customers, priceListItems } from "../../db/schema";
import { resolveStandingOrderForDate } from "../billing/counts";
import { weekdayInTimezone } from "../time";
import { listActiveStandingOrderFixtures } from "./standingOrders";
import { listAdjustmentsForDate } from "./adjustments";
import { listClosureDates } from "./closures";

/**
 * Idempotently generates today's route_stops from standing orders +
 * adjustments (skip both this and the count computation, but a customer
 * skipped/paused for the date gets no stop at all). Safe to call repeatedly
 * — the unique (operator, customer, slot, date) index makes re-running a
 * no-op for stops that already exist.
 */
export async function ensureRouteStopsForDate(db: Db, operatorId: string, date: string, timezone: string) {
  const closureDates = await listClosureDates(db, operatorId);
  if (closureDates.includes(date)) return;

  const weekday = weekdayInTimezone(date, timezone);
  const [orders, adjustments, customerRows] = await Promise.all([
    listActiveStandingOrderFixtures(db, operatorId),
    listAdjustmentsForDate(db, operatorId, date),
    db.select().from(customers).where(eq(customers.operatorId, operatorId)),
  ]);
  const sortOrderByCustomer = new Map(customerRows.map((c) => [c.id, c.routeSortOrder]));

  for (const order of orders) {
    const perItem = resolveStandingOrderForDate(order, adjustments, date, weekday);
    if (!perItem || Object.keys(perItem).length === 0) continue;

    await db
      .insert(routeStops)
      .values({
        operatorId,
        customerId: order.customerId,
        slotId: order.slotId,
        date,
        deliveryMethod: order.deliveryMethod ?? "delivery",
        sortOrder: sortOrderByCustomer.get(order.customerId) ?? 0,
      })
      .onConflictDoNothing();
  }
}

export async function listRouteStopsForDate(db: Db, operatorId: string, date: string) {
  const stops = await db
    .select({
      id: routeStops.id,
      customerId: routeStops.customerId,
      slotId: routeStops.slotId,
      date: routeStops.date,
      deliveryMethod: routeStops.deliveryMethod,
      sortOrder: routeStops.sortOrder,
      status: routeStops.status,
      chargeOnFail: routeStops.chargeOnFail,
      note: routeStops.note,
      markedBy: routeStops.markedBy,
      markedAt: routeStops.markedAt,
      customerName: customers.name,
      customerAddress: customers.address,
      customerFoodNotes: customers.foodNotes,
    })
    .from(routeStops)
    .innerJoin(customers, eq(customers.id, routeStops.customerId))
    .where(and(eq(routeStops.operatorId, operatorId), eq(routeStops.date, date)))
    .orderBy(routeStops.sortOrder);
  return stops;
}

async function effectiveItemsForStop(db: Db, operatorId: string, stop: { customerId: string; slotId: string; date: string }, timezone: string) {
  const weekday = weekdayInTimezone(stop.date, timezone);
  const [orders, adjustments] = await Promise.all([
    listActiveStandingOrderFixtures(db, operatorId),
    listAdjustmentsForDate(db, operatorId, stop.date),
  ]);
  const order = orders.find((o) => o.customerId === stop.customerId && o.slotId === stop.slotId);
  if (!order) return {};
  return resolveStandingOrderForDate(order, adjustments, stop.date, weekday) ?? {};
}

/**
 * Thrown when a route stop's effective items resolve to empty at mark-time —
 * e.g. an adjustment (skip/pause/set_quantity-to-0) landed for this
 * customer/date *after* the stop was generated. Marking the stop
 * delivered/not-delivered in that state would flip its status while writing
 * zero delivery_ledger rows, which looks like a successful delivery but
 * leaves no audit/billing trail behind it.
 */
export class StaleRouteStopError extends Error {}

interface MarkDeliveredInput {
  markedBy?: string | null;
  lat?: number | null;
  lng?: number | null;
  photoUrl?: string | null;
}

export async function markDelivered(db: Db, operatorId: string, routeStopId: string, timezone: string, input: MarkDeliveredInput) {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(routeStops)
      .where(and(eq(routeStops.id, routeStopId), eq(routeStops.operatorId, operatorId)));
    const stop = rows[0];
    if (!stop) throw new Error("route stop not found");
    if (stop.status !== "pending") return stop; // idempotent: already resolved

    const perItem = await effectiveItemsForStop(tx as Db, operatorId, stop, timezone);
    if (Object.keys(perItem).length === 0) {
      throw new StaleRouteStopError(
        "This order was skipped or changed for this date after today's route was generated — there's nothing left to mark delivered. Refresh Today to update the route.",
      );
    }
    const priceRows = await tx.select().from(priceListItems).where(eq(priceListItems.operatorId, operatorId));
    const priceById = new Map(priceRows.map((p) => [p.id, p.priceCents]));

    for (const [priceListItemId, quantity] of Object.entries(perItem)) {
      await tx
        .insert(deliveryLedger)
        .values({
          operatorId,
          customerId: stop.customerId,
          routeStopId: stop.id,
          date: stop.date,
          slotId: stop.slotId,
          priceListItemId,
          quantity,
          unitPriceCents: priceById.get(priceListItemId) ?? 0,
          status: "delivered",
        })
        .onConflictDoNothing();
    }

    const updated = await tx
      .update(routeStops)
      .set({
        status: "delivered",
        markedAt: new Date(),
        markedBy: input.markedBy ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        photoUrl: input.photoUrl ?? null,
      })
      .where(eq(routeStops.id, routeStopId))
      .returning();
    return updated[0]!;
  });
}

interface MarkNotDeliveredInput {
  chargeOnFail: boolean;
  note: string;
  markedBy?: string | null;
}

export async function markNotDelivered(db: Db, operatorId: string, routeStopId: string, timezone: string, input: MarkNotDeliveredInput) {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(routeStops)
      .where(and(eq(routeStops.id, routeStopId), eq(routeStops.operatorId, operatorId)));
    const stop = rows[0];
    if (!stop) throw new Error("route stop not found");
    if (stop.status !== "pending") return stop; // idempotent: already resolved

    const perItem = await effectiveItemsForStop(tx as Db, operatorId, stop, timezone);
    if (Object.keys(perItem).length === 0) {
      throw new StaleRouteStopError(
        "This order was skipped or changed for this date after today's route was generated — there's nothing left to mark. Refresh Today to update the route.",
      );
    }
    const priceRows = await tx.select().from(priceListItems).where(eq(priceListItems.operatorId, operatorId));
    const priceById = new Map(priceRows.map((p) => [p.id, p.priceCents]));
    const status = input.chargeOnFail ? "failed_charged" : "failed_not_charged";

    for (const [priceListItemId, quantity] of Object.entries(perItem)) {
      await tx
        .insert(deliveryLedger)
        .values({
          operatorId,
          customerId: stop.customerId,
          routeStopId: stop.id,
          date: stop.date,
          slotId: stop.slotId,
          priceListItemId,
          quantity,
          unitPriceCents: priceById.get(priceListItemId) ?? 0,
          status,
          note: input.note,
        })
        .onConflictDoNothing();
    }

    const updated = await tx
      .update(routeStops)
      .set({
        status: "not_delivered",
        chargeOnFail: input.chargeOnFail,
        note: input.note,
        markedAt: new Date(),
        markedBy: input.markedBy ?? null,
      })
      .where(eq(routeStops.id, routeStopId))
      .returning();
    return updated[0]!;
  });
}
