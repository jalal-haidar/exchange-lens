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

test.describe.serial("settings page", () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await bridgeLogin(page, tokens);
  });

  test("settings page loads", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/settings`);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByText("Appearance")).toBeVisible();
    await expect(page.getByText("About")).toBeVisible();
  });

  test("about section shows app info", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/settings`);
    await expect(page.getByText("Exchange Lens v0.1.0")).toBeVisible();
    await expect(page.getByText("Currency exchange management dashboard")).toBeVisible();
    await expect(page.getByText("Local currency: PKR (Pakistani Rupee)")).toBeVisible();
  });

  test("theme buttons render with correct labels", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/settings`);
    await expect(page.getByRole("button", { name: /Light/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Dark/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /System/ })).toBeVisible();
  });

  test("clicking Dark sets dark mode", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/settings`);
    await page.getByRole("button", { name: /Dark/ }).click();
    await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 5_000 });
    await expect(page.locator('button[title*="Theme"]')).toHaveAttribute("title", "Theme: dark");
  });

  test("clicking Light sets light mode", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/settings`);
    await page.getByRole("button", { name: /Light/ }).click();
    await expect(page.locator("html")).toHaveClass(/light/, { timeout: 5_000 });
    await expect(page.locator('button[title*="Theme"]')).toHaveAttribute("title", "Theme: light");
  });

  test("clicking System sets system mode", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/settings`);
    await page.getByRole("button", { name: /Light/ }).click();
    await expect(page.locator("html")).toHaveClass(/light/, { timeout: 5_000 });

    await page.getByRole("button", { name: /System/ }).click();
    await expect(page.locator('button[title*="Theme"]')).toHaveAttribute("title", "Theme: system");
  });
});
