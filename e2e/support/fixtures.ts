import { test as base, expect, type Page } from "@playwright/test";
import { operators, operatorSlots, priceListItems } from "../../db/schema";
import { ensureTestOperatorAuthUser } from "./auth";
import { resetTestDb, testDb } from "./db";

export interface OperatorFixture {
  operatorId: string;
  authUserId: string;
  timezone: string;
  email: string;
  password: string;
  slots: { id: string; key: string; label: string }[];
  priceList: { id: string; name: string; priceCents: number }[];
}

interface Fixtures {
  operatorFixture: OperatorFixture;
  authedPage: Page;
}

/**
 * `operatorFixture` truncates the test DB and reseeds one fresh operator +
 * a baseline slot/price list before every test — full isolation, since these
 * are money-path correctness tests where cross-test pollution would produce
 * false results. `authedPage` builds on it and returns a Page already
 * logged in (via the real login form, so session cookies are genuine).
 */
export const test = base.extend<Fixtures>({
  operatorFixture: async ({}, use) => {
    const authUser = await ensureTestOperatorAuthUser();
    await resetTestDb();

    const [operator] = await testDb
      .insert(operators)
      .values({
        authUserId: authUser.id,
        businessName: "E2E Test Kitchen",
        ownerName: "E2E Operator",
        email: authUser.email,
        timezone: "America/Toronto",
      })
      .returning();
    if (!operator) throw new Error("failed to seed test operator");

    const slotRows = await testDb
      .insert(operatorSlots)
      .values([
        { operatorId: operator.id, key: "lunch", label: "Lunch", cutoffTime: "11:00:00", sortOrder: 0 },
        { operatorId: operator.id, key: "dinner", label: "Dinner", cutoffTime: "18:00:00", sortOrder: 1 },
      ])
      .returning();

    const priceRows = await testDb
      .insert(priceListItems)
      .values([
        { operatorId: operator.id, name: "Veg", priceCents: 1000, sortOrder: 0 },
        { operatorId: operator.id, name: "Non-veg", priceCents: 1200, sortOrder: 1 },
        { operatorId: operator.id, name: "Protein", priceCents: 1400, sortOrder: 2 },
      ])
      .returning();

    await use({
      operatorId: operator.id,
      authUserId: authUser.id,
      timezone: operator.timezone,
      email: authUser.email,
      password: authUser.password,
      slots: slotRows,
      priceList: priceRows,
    });
  },

  authedPage: async ({ page, operatorFixture }, use) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(operatorFixture.email);
    await page.getByLabel("Password").fill(operatorFixture.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL("**/today**");
    await use(page);
  },
});

export { expect };
