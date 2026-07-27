import { eq } from "drizzle-orm";
import { row } from "./assert";
import type { Db } from "./types";
import { sumBillableCents } from "../lib/billing/settlement";
import * as schema from "./schema";

/**
 * Worked seed data proving all three billing models run on one engine:
 *  - Priya: prepaid, rollover plan
 *  - Grace: prepaid, expire-at-cycle-end plan
 *  - Ahmed: billed_arrears, weekly tab, with a skip and both failed-delivery
 *    outcomes
 *  - Marcus: billed_arrears, weekly batch (meal-prep) drop
 *
 * Accepts any drizzle Postgres database (postgres-js in production, PGlite
 * for local verification) since both implement the same query builder.
 */
export async function seed(db: Db) {
  const operator = row(
    await db
      .insert(schema.operators)
      .values({
        authUserId: "00000000-0000-0000-0000-000000000001",
        businessName: "Riverside Home Kitchen",
        ownerName: "Sam",
        email: "sam@example.com",
        timezone: "America/Toronto",
        botLanguage: "en",
        billingFrequency: "weekly",
        billingDayOfWeek: 5, // Friday
        gracePeriodDays: 1,
        trialStartedAt: new Date("2026-07-01T12:00:00Z"),
        trialEndsAt: new Date("2026-07-08T12:00:00Z"),
        subscriptionStatus: "active",
      })
      .returning(),
  );

  const slotRows = await db
    .insert(schema.operatorSlots)
    .values([
      { operatorId: operator.id, key: "lunch", label: "Lunch", cutoffTime: "10:00:00", sortOrder: 0 },
      { operatorId: operator.id, key: "dinner", label: "Dinner", cutoffTime: "20:00:00", sortOrder: 1 },
    ])
    .returning();
  const lunch = row(slotRows, 0);
  const dinner = row(slotRows, 1);

  const priceListRows = await db
    .insert(schema.priceListItems)
    .values([
      { operatorId: operator.id, name: "Veg", priceCents: 1000, sortOrder: 0 },
      { operatorId: operator.id, name: "Non-veg", priceCents: 1200, sortOrder: 1 },
      { operatorId: operator.id, name: "Protein", priceCents: 1400, sortOrder: 2 },
    ])
    .returning();
  const veg = row(priceListRows, 0);
  const nonVeg = row(priceListRows, 1);
  const protein = row(priceListRows, 2);

  const planRows = await db
    .insert(schema.prepaidPlans)
    .values([
      { operatorId: operator.id, name: "10-meal pack", pointsPerRenewal: 10, priceCents: 10000, rolloverEnabled: true },
      { operatorId: operator.id, name: "5-meal starter", pointsPerRenewal: 5, priceCents: 6000, rolloverEnabled: false },
    ])
    .returning();
  const rolloverPlan = row(planRows, 0);
  const expiryPlan = row(planRows, 1);

  // --- Prepaid, rollover: Priya ---------------------------------------
  const priya = row(
    await db
      .insert(schema.customers)
      .values({
        operatorId: operator.id,
        name: "Priya",
        phoneE164: "+14165550101",
        billingMode: "prepaid",
        prepaidPlanId: rolloverPlan.id,
        pointsBalance: 10,
      })
      .returning(),
  );

  const priyaOrder = row(
    await db
      .insert(schema.standingOrders)
      .values({
        operatorId: operator.id,
        customerId: priya.id,
        slotId: lunch.id,
        dayPattern: [1, 3, 5], // Mon, Wed, Fri
        cadence: "per_day",
        deliveryMethod: "delivery",
      })
      .returning(),
  );
  await db.insert(schema.standingOrderItems).values({
    operatorId: operator.id,
    standingOrderId: priyaOrder.id,
    priceListItemId: nonVeg.id,
    quantity: 1,
  });

  await db.insert(schema.pointTransactions).values({
    operatorId: operator.id,
    customerId: priya.id,
    type: "credit_renewal",
    points: 10,
    idempotencyKey: "seed-priya-renewal-1",
  });

  // --- Prepaid, expire-at-cycle-end: Grace ------------------------------
  const grace = row(
    await db
      .insert(schema.customers)
      .values({
        operatorId: operator.id,
        name: "Grace",
        phoneE164: "+14165550102",
        billingMode: "prepaid",
        prepaidPlanId: expiryPlan.id,
        pointsBalance: 5,
      })
      .returning(),
  );

  const graceOrder = row(
    await db
      .insert(schema.standingOrders)
      .values({
        operatorId: operator.id,
        customerId: grace.id,
        slotId: dinner.id,
        dayPattern: [2, 4], // Tue, Thu
        cadence: "per_day",
        deliveryMethod: "pickup",
      })
      .returning(),
  );
  await db.insert(schema.standingOrderItems).values({
    operatorId: operator.id,
    standingOrderId: graceOrder.id,
    priceListItemId: veg.id,
    quantity: 1,
  });

  // --- Billed arrears, weekly tab: Ahmed --------------------------------
  const ahmed = row(
    await db
      .insert(schema.customers)
      .values({
        operatorId: operator.id,
        name: "Ahmed",
        phoneE164: "+14165550103",
        billingMode: "billed_arrears",
      })
      .returning(),
  );

  const ahmedOrder = row(
    await db
      .insert(schema.standingOrders)
      .values({
        operatorId: operator.id,
        customerId: ahmed.id,
        slotId: dinner.id,
        dayPattern: [1, 2, 3, 4, 5], // Mon-Fri
        cadence: "per_day",
        deliveryMethod: "delivery",
      })
      .returning(),
  );
  await db.insert(schema.standingOrderItems).values({
    operatorId: operator.id,
    standingOrderId: ahmedOrder.id,
    priceListItemId: protein.id,
    quantity: 2,
  });

  // A skip (bot-confirmed) for the Wednesday of this week.
  await db.insert(schema.adjustments).values({
    operatorId: operator.id,
    customerId: ahmed.id,
    standingOrderId: ahmedOrder.id,
    effectiveDate: "2026-07-22",
    kind: "skip",
    source: "bot",
    note: "Customer messaged: skip Wednesday",
  });

  // A week's worth of route stops + ledger lines, including both failed-delivery outcomes.
  const ahmedDates = ["2026-07-20", "2026-07-21", "2026-07-23", "2026-07-24"]; // Mon,Tue,Thu,Fri (Wed skipped)
  for (const [i, date] of ahmedDates.entries()) {
    const stop = row(
      await db
        .insert(schema.routeStops)
        .values({
          operatorId: operator.id,
          customerId: ahmed.id,
          slotId: dinner.id,
          date,
          deliveryMethod: "delivery",
          sortOrder: 0,
          status: "delivered",
          markedAt: new Date(`${date}T21:00:00Z`),
        })
        .returning(),
    );

    const status = i === 2 ? "failed_charged" : i === 3 ? "failed_not_charged" : "delivered";
    if (status !== "delivered") {
      await db
        .update(schema.routeStops)
        .set({ status: "not_delivered", chargeOnFail: status === "failed_charged", note: "wrong address on file" })
        .where(eq(schema.routeStops.id, stop.id));
    }
    await db.insert(schema.deliveryLedger).values({
      operatorId: operator.id,
      customerId: ahmed.id,
      routeStopId: stop.id,
      date,
      slotId: dinner.id,
      priceListItemId: protein.id,
      quantity: 2,
      unitPriceCents: protein.priceCents,
      status,
      note: status !== "delivered" ? "wrong address on file" : null,
    });
  }

  const firstCycleLedgerLines = await db
    .select()
    .from(schema.deliveryLedger)
    .where(eq(schema.deliveryLedger.customerId, ahmed.id));

  const ahmedCycle = row(
    await db
      .insert(schema.billingCycles)
      .values({
        operatorId: operator.id,
        cycleDate: "2026-07-24",
        periodStart: "2026-07-20",
        periodEnd: "2026-07-24",
      })
      .returning(),
  );

  const newCharges = sumBillableCents(firstCycleLedgerLines);

  const ahmedCycleItem = row(
    await db
      .insert(schema.billingCycleItems)
      .values({
        operatorId: operator.id,
        billingCycleId: ahmedCycle.id,
        customerId: ahmed.id,
        previousBalanceCents: 0,
        newChargesCents: newCharges,
        totalDueCents: newCharges,
        status: "unpaid",
      })
      .returning(),
  );

  // Partial payment: operator edits the paid amount down from the computed total.
  await db.insert(schema.settlements).values({
    operatorId: operator.id,
    customerId: ahmed.id,
    billingCycleItemId: ahmedCycleItem.id,
    amountCents: newCharges - 1200,
    method: "e_transfer",
    paidAt: new Date("2026-07-25T15:00:00Z"),
    idempotencyKey: "seed-ahmed-payment-1",
  });
  await db
    .update(schema.billingCycleItems)
    .set({ amountPaidCents: newCharges - 1200, status: "partial" })
    .where(eq(schema.billingCycleItems.id, ahmedCycleItem.id));

  // --- Billed arrears, weekly batch (meal-prep): Marcus -----------------
  const marcus = row(
    await db
      .insert(schema.customers)
      .values({
        operatorId: operator.id,
        name: "Marcus",
        phoneE164: "+14165550104",
        billingMode: "billed_arrears",
      })
      .returning(),
  );

  const marcusOrder = row(
    await db
      .insert(schema.standingOrders)
      .values({
        operatorId: operator.id,
        customerId: marcus.id,
        slotId: lunch.id,
        dayPattern: [0], // Sunday drop
        cadence: "batch",
        periodDays: 7,
        deliveryMethod: "pickup",
      })
      .returning(),
  );
  await db.insert(schema.standingOrderItems).values({
    operatorId: operator.id,
    standingOrderId: marcusOrder.id,
    priceListItemId: protein.id,
    quantity: 7, // whole week's worth, dropped in one batch
  });

  // A closure (owner holiday) affecting the following week — zero counts, burn nothing.
  await db.insert(schema.closures).values({
    operatorId: operator.id,
    date: "2026-07-27",
    reason: "Family event",
  });

  return {
    operator,
    slots: { lunch, dinner },
    priceList: { veg, nonVeg, protein },
    customers: { priya, grace, ahmed, marcus },
  };
}
