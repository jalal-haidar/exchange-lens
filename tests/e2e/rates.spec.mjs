import { expect, test } from "@playwright/test";
import {
  EXCHANGE_URL,
  loginAndGetTokens,
  bridgeLogin,
  createApi,
} from "./helpers.mjs";

let tokens;
let api;

test.beforeAll(async () => {
  tokens = await loginAndGetTokens();
  api = createApi(tokens.accessToken);
});

test.describe.serial("rates management", () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await bridgeLogin(page, tokens);
  });

  test("rates table loads with currencies", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/rates`);
    await expect(page.getByRole("heading", { name: "Exchange Rates" })).toBeVisible();
    await expect(page.getByText("Manage buy and sell rates")).toBeVisible();
    await expect(page.getByText("Currency")).toBeVisible();
    await expect(page.getByText("Buy Rate")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Sell Rate" })).toBeVisible();
    await expect(page.getByText("Spread")).toBeVisible();
  });

  test("rate inputs are editable", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/rates`);
    const buyInput = page.locator("input[type='number']").first();
    await expect(buyInput).toBeVisible({ timeout: 15_000 });
    const originalValue = await buyInput.inputValue();
    expect(Number(originalValue)).toBeGreaterThan(0);
  });

  test("unsaved changes bar appears on edit", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/rates`);
    const buyInput = page.locator("input[type='number']").first();
    await expect(buyInput).toBeVisible({ timeout: 15_000 });

    const originalValue = await buyInput.inputValue();
    await buyInput.clear();
    await buyInput.fill(String(Number(originalValue) + 10));

    await expect(page.getByText("unsaved changes")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Save Changes")).toBeVisible();
    await expect(page.getByText("Discard")).toBeVisible();
  });

  test("discard reverts changes", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/rates`);
    const buyInput = page.locator("input[type='number']").first();
    await expect(buyInput).toBeVisible({ timeout: 15_000 });

    const originalValue = await buyInput.inputValue();
    await buyInput.clear();
    await buyInput.fill(String(Number(originalValue) + 10));
    await expect(page.getByText("unsaved changes")).toBeVisible({ timeout: 10_000 });

    await page.getByText("Discard").click();
    await expect(page.getByText("unsaved changes")).toBeHidden({ timeout: 10_000 });
    await expect(buyInput).toHaveValue(originalValue);
  });
});
