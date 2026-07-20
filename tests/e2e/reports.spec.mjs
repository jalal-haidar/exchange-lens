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

    await expect(page.getByText("Revenue")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Total Sell")).toBeVisible();
    await expect(page.getByText("Total Buy")).toBeVisible();
    await expect(page.getByText("Gross Profit")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Expenses" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Net Profit" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Credits" })).toBeVisible();
  });

  test("Daily Summary renders cards", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/reports`);
    await page.getByText("Daily Summary").click();

    await expect(page.getByText("Daily Summary").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Total Buy")).toBeVisible();
    await expect(page.getByText("Total Sell")).toBeVisible();
    await expect(page.getByText("Expenses", { exact: true })).toBeVisible();
    await expect(page.getByText("Profit", { exact: true })).toBeVisible();
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
