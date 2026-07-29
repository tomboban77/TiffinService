import { and, eq } from "drizzle-orm";
import { deliveryLedger, routeStops } from "../db/schema";
import { createCustomer } from "../lib/repo/customers";
import { createStandingOrder } from "../lib/repo/standingOrders";
import { createAdjustment } from "../lib/repo/adjustments";
import { testDb } from "./support/db";
import { test, expect } from "./support/fixtures";

const DELIVER_DATE = "2026-08-10"; // Monday
const STALE_DATE = "2026-08-11"; // Tuesday

test.describe("marking a route stop delivered", () => {
  test("writes a delivered ledger row with correct quantity and unit price", async ({ authedPage, operatorFixture }) => {
    const dinner = operatorFixture.slots.find((s) => s.key === "dinner")!;
    const protein = operatorFixture.priceList.find((p) => p.name === "Protein")!;

    const customer = await createCustomer(testDb, operatorFixture.operatorId, {
      name: "Ahmed",
      phoneE164: "+16135550100",
      billingMode: "billed_arrears",
    });
    await createStandingOrder(testDb, operatorFixture.operatorId, {
      customerId: customer.id,
      slotId: dinner.id,
      dayPattern: [0, 1, 2, 3, 4, 5, 6],
      cadence: "per_day",
      deliveryMethod: "delivery",
      items: [{ priceListItemId: protein.id, quantity: 2 }],
    });

    await authedPage.goto(`/today?date=${DELIVER_DATE}`);
    const stopCard = authedPage.locator("li", { hasText: "Ahmed" });
    await stopCard.getByRole("button", { name: "Delivered" }).click();
    await expect(stopCard.getByText("delivered", { exact: true })).toBeVisible();

    const [stop] = await testDb
      .select()
      .from(routeStops)
      .where(and(eq(routeStops.operatorId, operatorFixture.operatorId), eq(routeStops.customerId, customer.id), eq(routeStops.date, DELIVER_DATE)));
    expect(stop?.status).toBe("delivered");

    const ledgerRows = await testDb.select().from(deliveryLedger).where(eq(deliveryLedger.routeStopId, stop!.id));
    expect(ledgerRows).toHaveLength(1);
    expect(ledgerRows[0]?.quantity).toBe(2);
    expect(ledgerRows[0]?.unitPriceCents).toBe(protein.priceCents);
    expect(ledgerRows[0]?.status).toBe("delivered");
  });

  test("a stop invalidated by a later skip errors cleanly and stays pending with no ledger write", async ({ authedPage, operatorFixture }) => {
    const dinner = operatorFixture.slots.find((s) => s.key === "dinner")!;
    const protein = operatorFixture.priceList.find((p) => p.name === "Protein")!;

    const customer = await createCustomer(testDb, operatorFixture.operatorId, {
      name: "Grace",
      phoneE164: "+16135550101",
      billingMode: "billed_arrears",
    });
    await createStandingOrder(testDb, operatorFixture.operatorId, {
      customerId: customer.id,
      slotId: dinner.id,
      dayPattern: [0, 1, 2, 3, 4, 5, 6],
      cadence: "per_day",
      deliveryMethod: "delivery",
      items: [{ priceListItemId: protein.id, quantity: 1 }],
    });

    // Generate the stop first (visiting Today calls ensureRouteStopsForDate).
    await authedPage.goto(`/today?date=${STALE_DATE}`);
    await expect(authedPage.getByText("Grace")).toBeVisible();

    // Now a skip lands for the same date, after the stop already exists —
    // simulating the "Skip a day" / adjustment form being used after the
    // route was generated.
    await createAdjustment(testDb, operatorFixture.operatorId, {
      customerId: customer.id,
      standingOrderId: null,
      effectiveDate: STALE_DATE,
      kind: "skip",
      source: "operator",
    });

    const stopCard = authedPage.locator("li", { hasText: "Grace" });
    await stopCard.getByRole("button", { name: "Delivered" }).click();

    await expect(authedPage.getByText(/nothing left to mark delivered/i)).toBeVisible();

    const [stop] = await testDb
      .select()
      .from(routeStops)
      .where(and(eq(routeStops.operatorId, operatorFixture.operatorId), eq(routeStops.customerId, customer.id), eq(routeStops.date, STALE_DATE)));
    expect(stop?.status).toBe("pending");

    const ledgerRows = await testDb.select().from(deliveryLedger).where(eq(deliveryLedger.routeStopId, stop!.id));
    expect(ledgerRows).toHaveLength(0);
  });
});
