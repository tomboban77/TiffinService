import type { Page } from "@playwright/test";
import { createCustomer } from "../lib/repo/customers";
import { createStandingOrder } from "../lib/repo/standingOrders";
import { testDb } from "./support/db";
import { test, expect } from "./support/fixtures";

// 2026-08-10 is a Monday (confirmed against scripts/verify-local.ts's own
// Monday anchor, one week later); 2026-08-16 is the following Sunday.
const WEEK = [
  { date: "2026-08-10", label: "Mon", expected: 2 },
  { date: "2026-08-11", label: "Tue", expected: 5 },
  { date: "2026-08-12", label: "Wed", expected: 2 },
  { date: "2026-08-13", label: "Thu", expected: 5 },
  { date: "2026-08-14", label: "Fri", expected: 2 },
  { date: "2026-08-15", label: "Sat", expected: null },
  { date: "2026-08-16", label: "Sun", expected: null },
];

async function expectProteinCount(page: Page, date: string, expected: number | null) {
  await page.goto(`/today?date=${date}`);
  if (expected === null) {
    // Both slots (lunch and dinner) are empty on these dates, so two cards
    // render this text — .first() just needs one to confirm the state.
    await expect(page.getByText("Nothing scheduled.").first()).toBeVisible();
    return;
  }
  const tile = page.locator("div.rounded-lg.bg-gray-50.p-3", { hasText: "Protein" });
  await expect(tile.locator("div.text-3xl")).toHaveText(String(expected));
}

test("combined per-meal-type counts across a week, including empty weekends", async ({ authedPage, operatorFixture }) => {
  const dinner = operatorFixture.slots.find((s) => s.key === "dinner")!;
  const protein = operatorFixture.priceList.find((p) => p.name === "Protein")!;

  const weekdayCustomer = await createCustomer(testDb, operatorFixture.operatorId, {
    name: "Ahmed",
    phoneE164: "+16135550104",
    billingMode: "billed_arrears",
  });
  await createStandingOrder(testDb, operatorFixture.operatorId, {
    customerId: weekdayCustomer.id,
    slotId: dinner.id,
    dayPattern: [1, 2, 3, 4, 5], // Mon-Fri
    cadence: "per_day",
    deliveryMethod: "delivery",
    items: [{ priceListItemId: protein.id, quantity: 2 }],
  });

  const tueThuCustomer = await createCustomer(testDb, operatorFixture.operatorId, {
    name: "Grace",
    phoneE164: "+16135550105",
    billingMode: "billed_arrears",
  });
  await createStandingOrder(testDb, operatorFixture.operatorId, {
    customerId: tueThuCustomer.id,
    slotId: dinner.id,
    dayPattern: [2, 4], // Tue, Thu
    cadence: "per_day",
    deliveryMethod: "delivery",
    items: [{ priceListItemId: protein.id, quantity: 3 }],
  });

  for (const day of WEEK) {
    await test.step(`${day.label} ${day.date}: expect ${day.expected ?? "nothing scheduled"}`, async () => {
      await expectProteinCount(authedPage, day.date, day.expected);
    });
  }
});
