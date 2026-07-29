import type { Page } from "@playwright/test";
import { createCustomer } from "../lib/repo/customers";
import { createStandingOrder } from "../lib/repo/standingOrders";
import { testDb } from "./support/db";
import { test, expect } from "./support/fixtures";

const DATE = "2026-08-12"; // Wednesday
const NEXT_DATE = "2026-08-13";

// The "Add a standing order" form's Quantities fieldset and the "Add
// adjustment" form's Meal types fieldset both render an input per price
// list item, sharing the same `qty-{id}` name/label text — scope to the
// adjustment form's fieldset specifically to disambiguate.
function mealTypeInput(page: Page, name: string) {
  // exact: true matters — "Veg" is a substring of "Non-veg".
  return page.getByRole("group", { name: /Meal types/ }).getByLabel(name, { exact: true });
}

test.describe("the compact Add adjustment form", () => {
  test("a skip removes the customer from that date's count and route, restores the next day, and logs to history", async ({
    authedPage,
    operatorFixture,
  }) => {
    const dinner = operatorFixture.slots.find((s) => s.key === "dinner")!;
    const protein = operatorFixture.priceList.find((p) => p.name === "Protein")!;

    const customer = await createCustomer(testDb, operatorFixture.operatorId, {
      name: "Priya",
      phoneE164: "+16135550102",
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

    // Skip Protein entirely for DATE via the customer-page adjustment form —
    // deliberately *before* ever visiting Today for DATE. Visiting first
    // would generate a route stop that a later skip doesn't retract (that
    // retraction is explicitly deferred to milestone 3's event-driven
    // regeneration per docs/BUILD_SPEC.md — the mark-time StaleRouteStopError
    // guard is the interim manual-phase behavior), so this order avoids
    // conflating that known, accepted gap with what this test is checking.
    await authedPage.goto(`/customers/${customer.id}`);
    await authedPage.getByLabel("Date", { exact: true }).fill(DATE);
    await mealTypeInput(authedPage, "Protein").fill("0");
    await authedPage.getByRole("button", { name: "Add adjustment" }).click();

    await expect(authedPage.getByText(/Protein: skip/)).toBeVisible();

    // Never appears in the count or the route for DATE.
    await authedPage.goto(`/today?date=${DATE}`);
    await expect(authedPage.getByText("Priya")).toHaveCount(0);
    await expect(authedPage.getByText("Nothing scheduled.").first()).toBeVisible();
    await expect(authedPage.getByText("Nothing here today.").first()).toBeVisible();

    // Restored the next day — the skip was for DATE only.
    await authedPage.goto(`/today?date=${NEXT_DATE}`);
    await expect(authedPage.getByText("Priya")).toBeVisible();
  });

  test("a quantity override applies, and two separate submissions for different meal types on the same date coexist", async ({
    authedPage,
    operatorFixture,
  }) => {
    const dinner = operatorFixture.slots.find((s) => s.key === "dinner")!;
    const protein = operatorFixture.priceList.find((p) => p.name === "Protein")!;
    const veg = operatorFixture.priceList.find((p) => p.name === "Veg")!;

    const customer = await createCustomer(testDb, operatorFixture.operatorId, {
      name: "Sam",
      phoneE164: "+16135550103",
      billingMode: "billed_arrears",
    });
    await createStandingOrder(testDb, operatorFixture.operatorId, {
      customerId: customer.id,
      slotId: dinner.id,
      dayPattern: [0, 1, 2, 3, 4, 5, 6],
      cadence: "per_day",
      deliveryMethod: "delivery",
      items: [
        { priceListItemId: protein.id, quantity: 2 },
        { priceListItemId: veg.id, quantity: 1 },
      ],
    });

    await authedPage.goto(`/customers/${customer.id}`);

    // First submission: skip protein for DATE.
    await authedPage.getByLabel("Date", { exact: true }).fill(DATE);
    await mealTypeInput(authedPage, "Protein").fill("0");
    await authedPage.getByRole("button", { name: "Add adjustment" }).click();
    await expect(authedPage.getByText(/Protein: skip/)).toBeVisible();

    // Second, separate submission: override veg to 5 for the SAME date. This
    // must not cancel the protein skip from the first submission — that was
    // the exact supersession bug fixed while building this suite.
    await authedPage.getByLabel("Date", { exact: true }).fill(DATE);
    await mealTypeInput(authedPage, "Veg").fill("5");
    await authedPage.getByRole("button", { name: "Add adjustment" }).click();

    await expect(authedPage.getByText(/Protein: skip/)).toBeVisible();
    await expect(authedPage.getByText(/Veg: set_quantity 5/)).toBeVisible();

    // Reflected correctly in the Today count: no protein, 5 veg.
    await authedPage.goto(`/today?date=${DATE}`);
    const cookCounts = authedPage.locator("section", { hasText: "Cook counts" });
    await expect(cookCounts.getByText("Protein")).toHaveCount(0);
    await expect(cookCounts.getByText("Veg")).toBeVisible();
    await expect(cookCounts.getByText("5", { exact: true })).toBeVisible();
  });
});
