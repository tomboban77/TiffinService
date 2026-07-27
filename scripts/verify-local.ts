import { eq } from "drizzle-orm";
import { row } from "../db/assert";
import { createLocalDb } from "../db/localDb";
import { seed } from "../db/seedData";
import * as schema from "../db/schema";
import { computeDailyCounts } from "../lib/billing/counts";
import { listActiveStandingOrderFixtures } from "../lib/repo/standingOrders";
import { listAdjustmentsForDate } from "../lib/repo/adjustments";
import { listClosureDates } from "../lib/repo/closures";
import { ensureRouteStopsForDate, listRouteStopsForDate, markDelivered, markNotDelivered } from "../lib/repo/routeStops";
import { weekdayInTimezone } from "../lib/time";

async function expectThrow(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    throw new Error(`FAIL: expected "${label}" to throw, but it succeeded`);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("FAIL:")) throw err;
    console.log(`  ok  - ${label} rejected as expected`);
  }
}

function assertEqual(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`FAIL: ${label} — expected ${expected}, got ${actual}`);
  }
  console.log(`  ok  - ${label} = ${actual}`);
}

async function main() {
  console.log("Applying migrations (0000 schema, 0002 immutability triggers) to PGlite...");
  const { db } = await createLocalDb();
  console.log("Migrations applied cleanly.\n");

  console.log("Seeding all three billing models on one engine...");
  const seeded = await seed(db);
  console.log("Seed complete.\n");

  console.log("Checking computed billing math for Ahmed (billed_arrears, weekly tab)...");
  const cycleItem = row(
    await db
      .select()
      .from(schema.billingCycleItems)
      .where(eq(schema.billingCycleItems.customerId, seeded.customers.ahmed.id)),
  );
  // 2 delivered + 1 failed_charged, 2 protein @ $14 each = 3 * 2 * 1400 = 8400c; failed_not_charged excluded.
  assertEqual("Ahmed newChargesCents (excludes failed_not_charged)", cycleItem.newChargesCents, 8400);
  assertEqual("Ahmed totalDueCents", cycleItem.totalDueCents, 8400);
  assertEqual("Ahmed amountPaidCents (partial payment)", cycleItem.amountPaidCents, 7200);
  assertEqual("Ahmed status", cycleItem.status, "partial");

  console.log("\nChecking billing_cycle_items immutability trigger...");
  await expectThrow("mutating a frozen cycle item's new_charges_cents", () =>
    db.update(schema.billingCycleItems).set({ newChargesCents: 1 }).where(eq(schema.billingCycleItems.id, cycleItem.id)),
  );
  console.log("  (amount_paid_cents / status remain mutable, as seeded above)");

  console.log("\nChecking billing_cycles immutability trigger...");
  const cycle = row(await db.select().from(schema.billingCycles).limit(1));
  await expectThrow("mutating a frozen billing cycle", () =>
    db.update(schema.billingCycles).set({ periodEnd: "2099-01-01" }).where(eq(schema.billingCycles.id, cycle.id)),
  );

  console.log("\nChecking idempotency constraints...");
  await expectThrow("duplicate route_stop for the same (operator, customer, slot, date)", () =>
    db.insert(schema.routeStops).values({
      operatorId: seeded.operator.id,
      customerId: seeded.customers.ahmed.id,
      slotId: seeded.slots.dinner.id,
      date: "2026-07-20",
      deliveryMethod: "delivery",
      sortOrder: 0,
    }),
  );
  await expectThrow("re-using a settlement idempotency key", () =>
    db.insert(schema.settlements).values({
      operatorId: seeded.operator.id,
      customerId: seeded.customers.ahmed.id,
      amountCents: 100,
      paidAt: new Date(),
      idempotencyKey: "seed-ahmed-payment-1",
    }),
  );

  console.log("\nChecking cross-tenant composite FK consistency...");
  const otherOperator = row(
    await db
      .insert(schema.operators)
      .values({
        authUserId: "00000000-0000-0000-0000-000000000099",
        businessName: "Other Kitchen",
        ownerName: "Jo",
        email: "jo@example.com",
        timezone: "America/Toronto",
      })
      .returning(),
  );
  await expectThrow("a standing order whose customer belongs to a different operator", () =>
    db.insert(schema.standingOrders).values({
      operatorId: otherOperator.id, // mismatched: ahmed belongs to `seeded.operator`, not this one
      customerId: seeded.customers.ahmed.id,
      slotId: seeded.slots.dinner.id,
      dayPattern: [1],
      cadence: "per_day",
      deliveryMethod: "delivery",
    }),
  );

  console.log("\nChecking the repo layer end-to-end (counts -> route stops -> mark delivered/not-delivered)...");
  // 2026-08-03 is a fresh Monday untouched by the seed script's hand-written ledger rows.
  const routeDate = "2026-08-03";
  const weekday = weekdayInTimezone(routeDate, seeded.operator.timezone);
  assertEqual("2026-08-03 resolves to Monday in America/Toronto", weekday, 1);

  const [orders, adjustmentsForDate, closureDates] = await Promise.all([
    listActiveStandingOrderFixtures(db, seeded.operator.id),
    listAdjustmentsForDate(db, seeded.operator.id, routeDate),
    listClosureDates(db, seeded.operator.id),
  ]);
  const dinnerCounts = computeDailyCounts({
    date: routeDate,
    slotId: seeded.slots.dinner.id,
    standingOrders: orders,
    adjustments: adjustmentsForDate,
    closureDates,
    weekday,
  });
  // Ahmed (2 protein, Mon-Fri, no adjustment on this date) + Grace is Tue/Thu only, so Monday dinner is Ahmed alone.
  assertEqual("Monday dinner protein count is Ahmed's 2 (Grace doesn't order Mondays)", dinnerCounts[seeded.priceList.protein.id], 2);

  await ensureRouteStopsForDate(db, seeded.operator.id, routeDate, seeded.operator.timezone);
  await ensureRouteStopsForDate(db, seeded.operator.id, routeDate, seeded.operator.timezone); // must be idempotent
  const allMondayStops = await listRouteStopsForDate(db, seeded.operator.id, routeDate);
  // Priya's lunch order (Mon/Wed/Fri) also lands on this Monday, alongside Ahmed's dinner order.
  assertEqual("Monday generates stops for both slots (Priya's lunch + Ahmed's dinner)", allMondayStops.length, 2);
  const stops = allMondayStops.filter((s) => s.slotId === seeded.slots.dinner.id);
  assertEqual("exactly one dinner route stop generated for Monday (Ahmed)", stops.length, 1);
  assertEqual("generated dinner stop is for Ahmed", stops[0]?.customerId, seeded.customers.ahmed.id);

  const delivered = await markDelivered(db, seeded.operator.id, stops[0]!.id, seeded.operator.timezone, { markedBy: "Sam" });
  assertEqual("markDelivered sets status", delivered.status, "delivered");
  const ledgerAfterDeliver = await db
    .select()
    .from(schema.deliveryLedger)
    .where(eq(schema.deliveryLedger.routeStopId, stops[0]!.id));
  assertEqual("marking delivered writes exactly one ledger line (one price list item)", ledgerAfterDeliver.length, 1);
  assertEqual("ledger line quantity matches the standing order", ledgerAfterDeliver[0]?.quantity, 2);

  const secondMark = await markDelivered(db, seeded.operator.id, stops[0]!.id, seeded.operator.timezone, { markedBy: "Someone else" });
  assertEqual("re-marking an already-delivered stop is a no-op (idempotent)", secondMark.markedBy, "Sam");
  const ledgerAfterRetry = await db
    .select()
    .from(schema.deliveryLedger)
    .where(eq(schema.deliveryLedger.routeStopId, stops[0]!.id));
  assertEqual("retrying markDelivered never double-writes the ledger", ledgerAfterRetry.length, 1);

  // A separate date, marked not-delivered with a charge, to prove the failed-charged path.
  const failDate = "2026-08-04"; // Tuesday: Ahmed (Mon-Fri) + Grace (Tue/Thu dinner)
  await ensureRouteStopsForDate(db, seeded.operator.id, failDate, seeded.operator.timezone);
  const failStops = await listRouteStopsForDate(db, seeded.operator.id, failDate);
  assertEqual("Tuesday dinner has stops for both Ahmed and Grace", failStops.length, 2);
  const ahmedStop = row(failStops.filter((s) => s.customerId === seeded.customers.ahmed.id));
  const notDelivered = await markNotDelivered(db, seeded.operator.id, ahmedStop.id, seeded.operator.timezone, {
    chargeOnFail: true,
    note: "gate locked, no answer",
    markedBy: "Sam",
  });
  assertEqual("markNotDelivered sets status", notDelivered.status, "not_delivered");
  const failLedger = row(
    await db.select().from(schema.deliveryLedger).where(eq(schema.deliveryLedger.routeStopId, ahmedStop.id)),
  );
  assertEqual("a charged failed delivery still writes a ledger line (audit trail)", failLedger.status, "failed_charged");

  console.log("\nAll checks passed.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
