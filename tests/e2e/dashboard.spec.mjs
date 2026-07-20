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

test.describe.serial("dashboard & navigation", () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await bridgeLogin(page, tokens);
  });

  test("dashboard heading renders", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(
      page.getByText("Welcome back. Here's your exchange overview.")
    ).toBeVisible();
  });

  test("stats cards render", async ({ page }) => {
    const stats = page.locator("#main-content");
    await expect(stats.getByText("Total Buy")).toBeVisible({ timeout: 15_000 });
    await expect(stats.getByText("Total Sell")).toBeVisible();
    await expect(stats.getByText("Profit", { exact: true })).toBeVisible();
    await expect(stats.getByText("Expenses", { exact: true })).toBeVisible();
    await expect(stats.getByText("Customers", { exact: true })).toBeVisible();
    await expect(stats.getByText("Pending Credits")).toBeVisible();
  });

  test("recent transactions section renders", async ({ page }) => {
    await expect(page.getByText("Recent Transactions")).toBeVisible();
    await expect(page.getByText("View all →")).toBeVisible();
  });

  test("quick action — Buy Currency navigates correctly", async ({ page }) => {
    await page.getByText("Buy Currency").click();
    await expect(page).toHaveURL(/\/transactions\/new\?type=buy/);
  });

  test("quick action — Sell Currency navigates correctly", async ({ page }) => {
    await page.getByText("Sell Currency").click();
    await expect(page).toHaveURL(/\/transactions\/new\?type=sell/);
  });

  test("quick action — Give Credit navigates correctly", async ({ page }) => {
    await page.getByText("Give Credit").click();
    await expect(page).toHaveURL(/\/transactions\/new\?type=credit_given/);
  });

  test("quick action — Record Expense navigates correctly", async ({ page }) => {
    await page.getByText("Record Expense").click();
    await expect(page).toHaveURL(/\/transactions\/new\?type=expense/);
  });

  test("nav links navigate to correct pages", async ({ page }) => {
    await page.getByRole("link", { name: /Customers/ }).first().click();
    await expect(page).toHaveURL(/\/customers/);
    await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();

    await page.getByRole("link", { name: /Transactions/ }).first().click();
    await expect(page).toHaveURL(/\/transactions/);
    await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible();

    await page.getByRole("link", { name: /Rates/ }).first().click();
    await expect(page).toHaveURL(/\/rates/);
    await expect(page.getByRole("heading", { name: "Exchange Rates" })).toBeVisible();

    await page.getByRole("link", { name: /Expenses/ }).first().click();
    await expect(page).toHaveURL(/\/expenses/);
    await expect(page.getByRole("heading", { name: "Expenses" })).toBeVisible();

    await page.getByRole("link", { name: /Reports/ }).first().click();
    await expect(page).toHaveURL(/\/reports/);
    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  });

  test("theme toggle cycles through modes", async ({ page }) => {
    const themeBtn = page.locator('button[title*="Theme"]');

    await expect(themeBtn).toHaveAttribute("title", "Theme: system");

    await themeBtn.click();
    await expect(themeBtn).toHaveAttribute("title", "Theme: light");
    await expect(page.locator("html")).toHaveClass(/light/);

    await themeBtn.click();
    await expect(themeBtn).toHaveAttribute("title", "Theme: dark");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("logo links to dashboard", async ({ page }) => {
    await page.getByRole("link", { name: "Exchange Lens" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
