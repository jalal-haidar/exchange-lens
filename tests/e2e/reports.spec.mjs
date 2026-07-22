import { expect, test } from "@playwright/test";
import {
  EXCHANGE_URL,
  loginAndGetTokens,
  bridgeLogin,
} from "./helpers.mjs";

let tokens;

test.beforeAll(async () => {
  tokens = await loginAndGetTokens();
});

test.describe.serial("reports", () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await bridgeLogin(page, tokens);
  });

  test("reports page loads", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/reports`);
    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
    await expect(page.getByText("View financial reports and analytics")).toBeVisible();
  });

  test("P&L report type renders sections", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/reports`);
    await page.getByText("Profit & Loss").click();

    await expect(page.getByRole("heading", { name: "Cash Movement" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Currency sold")).toBeVisible();
    await expect(page.getByText("Currency bought")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Realized Performance" })).toBeVisible();
    await expect(page.getByText("Realized FX margin")).toBeVisible();
    await expect(page.getByText("Net realized profit")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Customer Credit Movement" })).toBeVisible();
  });

  test("Daily Summary renders cards", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/reports`);
    await page.getByText("Daily Summary").click();

    await expect(page.getByText("Daily Summary").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Total Buy")).toBeVisible();
    await expect(page.getByText("Total Sell")).toBeVisible();
    await expect(page.getByText("Expenses", { exact: true })).toBeVisible();
    await expect(page.getByText("Realized FX margin", { exact: true })).toBeVisible();
    await expect(page.getByText("Net realized profit", { exact: true })).toBeVisible();
  });

  test("date picker changes report data", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/reports`);
    await page.getByText("Daily Summary").click();
    await expect(page.getByText("Daily Summary").first()).toBeVisible({ timeout: 15_000 });

    const dateInput = page.locator("input[type='date']");
    await expect(dateInput).toBeVisible();

    const today = new Date().toISOString().split("T")[0];
    await expect(dateInput).toHaveValue(today);

    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    await dateInput.fill(yesterday);
    await expect(dateInput).toHaveValue(yesterday);
  });
});
