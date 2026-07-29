import { test, expect } from "./support/fixtures";

test("smoke: login, add a meal type in Settings, duplicate add shows a friendly error", async ({ authedPage }) => {
  await authedPage.goto("/settings");

  const priceList = authedPage.locator("section", { hasText: "Price list" });
  await priceList.getByPlaceholder("Meal type").fill("Rice");
  await priceList.getByPlaceholder("Price").fill("5.00");
  await priceList.getByRole("button", { name: "Add" }).click();

  await expect(authedPage.getByText("Rice — $5.00")).toBeVisible();

  // Duplicate (case-insensitive) add. Locators re-query live, so `priceList`
  // still resolves correctly after the page reload above.
  await priceList.getByPlaceholder("Meal type").fill("rice");
  await priceList.getByPlaceholder("Price").fill("5.00");
  await priceList.getByRole("button", { name: "Add" }).click();

  await expect(authedPage.getByText(/already exists/i)).toBeVisible();
});
