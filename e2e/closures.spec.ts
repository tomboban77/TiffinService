import { eq, and } from "drizzle-orm";
import { adjustments } from "../db/schema";
import { createCustomer } from "../lib/repo/customers";
import { createStandingOrder } from "../lib/repo/standingOrders";
import { testDb } from "./support/db";
import { test, expect } from "./support/fixtures";

const CLOSED_DATE = "2026-08-17"; // Monday
const NEXT_DATE = "2026-08-18";

test("a closure zeros the day's counts and route without writing any per-customer skip adjustment, and resumes the next day", async ({
  authedPage,
  operatorFixture,
}) => {
  const dinner = operatorFixture.slots.find((s) => s.key === "dinner")!;
  const protein = operatorFixture.priceList.find((p) => p.name === "Protein")!;

  const customer = await createCustomer(testDb, operatorFixture.operatorId, {
    name: "Ahmed",
    phoneE164: "+16135550106",
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

  await authedPage.goto(`/today?date=${CLOSED_DATE}`);
  await expect(authedPage.getByText("Ahmed")).toBeVisible();

  await authedPage.getByPlaceholder("Reason (optional)").fill("Owner's day off");
  await authedPage.getByRole("button", { name: "Close this day" }).click();

  await expect(authedPage.getByText(/no counts, no route, nothing burns today/i)).toBeVisible();
  await expect(authedPage.getByText("Ahmed")).toHaveCount(0);

  // No skip (or any) adjustment was written for the customer on the closed date.
  const customerAdjustments = await testDb
    .select()
    .from(adjustments)
    .where(and(eq(adjustments.customerId, customer.id), eq(adjustments.effectiveDate, CLOSED_DATE)));
  expect(customerAdjustments).toHaveLength(0);

  // Service resumes normally the next day.
  await authedPage.goto(`/today?date=${NEXT_DATE}`);
  await expect(authedPage.getByText("Ahmed")).toBeVisible();
});
