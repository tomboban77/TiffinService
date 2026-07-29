import { createCustomer } from "../lib/repo/customers";
import { createStandingOrder } from "../lib/repo/standingOrders";
import { testDb } from "./support/db";
import { test, expect } from "./support/fixtures";

const DATE_DELIVERED = "2026-08-20";
const DATE_FAILED_NO_CHARGE = "2026-08-21";
const DATE_FAILED_CHARGED = "2026-08-22";

test("a prepaid customer's balance burns on delivery and on a charged failed delivery, but not on a no-charge failed delivery", async ({
  authedPage,
  operatorFixture,
}) => {
  test.slow(); // three separate mark-delivery round trips, each with its own page navigation
  const dinner = operatorFixture.slots.find((s) => s.key === "dinner")!;
  const protein = operatorFixture.priceList.find((p) => p.name === "Protein")!;

  const customer = await createCustomer(testDb, operatorFixture.operatorId, {
    name: "Priya",
    phoneE164: "+16135550107",
    billingMode: "prepaid",
  });
  await createStandingOrder(testDb, operatorFixture.operatorId, {
    customerId: customer.id,
    slotId: dinner.id,
    dayPattern: [0, 1, 2, 3, 4, 5, 6],
    cadence: "per_day",
    deliveryMethod: "delivery",
    items: [{ priceListItemId: protein.id, quantity: 2 }],
  });

  // Manual +/- is the only way to add points until milestone 4 (plan-based
  // top-up/renewal) — exercise the real UI, not a direct DB write.
  await authedPage.goto(`/customers/${customer.id}`);
  await authedPage.getByLabel("Delta (+/-)").fill("20");
  await authedPage.getByLabel("Note (required)").fill("seed test balance");
  await authedPage.getByRole("button", { name: "Apply" }).click();
  await expect(authedPage.getByText("Prepaid — 20 pts")).toBeVisible();

  // Delivered burns the quantity delivered.
  await authedPage.goto(`/today?date=${DATE_DELIVERED}`);
  const deliveredStop = authedPage.locator("li", { hasText: "Priya" });
  await deliveredStop.getByRole("button", { name: "Delivered" }).click();
  await expect(deliveredStop.getByText("delivered", { exact: true })).toBeVisible();
  await authedPage.goto(`/customers/${customer.id}`);
  await expect(authedPage.getByText("Prepaid — 18 pts")).toBeVisible();

  // A no-charge failed delivery burns nothing.
  await authedPage.goto(`/today?date=${DATE_FAILED_NO_CHARGE}`);
  const noChargeStop = authedPage.locator("li", { hasText: "Priya" });
  await noChargeStop.getByText("Not delivered", { exact: true }).click();
  await noChargeStop.getByPlaceholder("Note (required)").fill("no answer at the door");
  await noChargeStop.getByRole("button", { name: "Confirm" }).click();
  await expect(noChargeStop.getByText("not_delivered", { exact: true })).toBeVisible();
  await authedPage.goto(`/customers/${customer.id}`);
  await expect(authedPage.getByText("Prepaid — 18 pts")).toBeVisible();

  // A charged failed delivery still burns the quantity — the customer's
  // order was still made available, same as a successful delivery.
  await authedPage.goto(`/today?date=${DATE_FAILED_CHARGED}`);
  const chargedStop = authedPage.locator("li", { hasText: "Priya" });
  await chargedStop.getByText("Not delivered", { exact: true }).click();
  await chargedStop.getByLabel("Charge anyway").check();
  await chargedStop.getByPlaceholder("Note (required)").fill("gate locked, no answer");
  await chargedStop.getByRole("button", { name: "Confirm" }).click();
  await expect(chargedStop.getByText("not_delivered", { exact: true })).toBeVisible();
  await authedPage.goto(`/customers/${customer.id}`);
  await expect(authedPage.getByText("Prepaid — 16 pts")).toBeVisible();
});

// Deliberately still deferred — see docs/BUILD_SPEC.md milestone 4 ("points
// renewals"). Burning on delivery (tested above) is core ledger correctness
// and is wired; a plan-based top-up/renewal action is real feature work the
// user explicitly chose not to build ahead of schedule. Manual +/- remains
// the only way to add points for the pilot phase.
test.fixme(
  "a 10-meal plan top-up credits points via a plan-based renewal action, and the Sunday batch aggregates the period",
  async () => {},
);
