import { eq } from "drizzle-orm";
import { customers } from "../db/schema";
import { testDb } from "./support/db";
import { test, expect } from "./support/fixtures";

test.describe("customer phone number normalization", () => {
  test("a bare 10-digit number is normalized and stored as E.164", async ({ authedPage, operatorFixture }) => {
    await authedPage.goto("/customers/new");
    await authedPage.getByLabel("Name").fill("Devi");
    await authedPage.getByLabel(/Phone/).fill("9055550102");
    await authedPage.getByRole("button", { name: "Save" }).click();

    await authedPage.waitForURL(/\/customers\/[0-9a-f-]+$/);

    const [stored] = await testDb.select().from(customers).where(eq(customers.operatorId, operatorFixture.operatorId));
    expect(stored?.phoneE164).toBe("+19055550102");
  });

  test("an unparseable number is rejected with a friendly error, not silently stored", async ({ authedPage }) => {
    await authedPage.goto("/customers/new");
    await authedPage.getByLabel("Name").fill("Bad Number");
    await authedPage.getByLabel(/Phone/).fill("not a phone number");
    await authedPage.getByRole("button", { name: "Save" }).click();

    await expect(authedPage.getByText(/doesn't look valid/i)).toBeVisible();
    expect(authedPage.url()).toContain("/customers/new");
  });
});
