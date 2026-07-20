import { expect, test } from "@playwright/test";
import {
  EXCHANGE_URL,
  HUB_URL,
  loginAndGetTokens,
  bridgeLogin,
} from "./helpers.mjs";

let tokens;

test.beforeAll(async () => {
  tokens = await loginAndGetTokens();
});

test.describe.serial("auth flow", () => {
  test.setTimeout(180_000);

  test("unauthenticated visit redirects to hub login", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/dashboard`);
    await expect(page).toHaveURL(/localhost:3000\/login/, { timeout: 30_000 });
  });

  test("bridge login lands on dashboard", async ({ page }) => {
    await bridgeLogin(page, tokens, "/dashboard");
    await expect(page).toHaveURL(/localhost:3005\/dashboard/, { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("root path redirects to /dashboard", async ({ page }) => {
    await bridgeLogin(page, tokens, "/");
    await expect(page).toHaveURL(/localhost:3005\/dashboard/, { timeout: 60_000 });
  });

  test("authenticated API returns 200", async ({ page }) => {
    const response = await page.request.get(`${EXCHANGE_URL}/api/v1/customers`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    expect(response.status()).toBe(200);
  });

  test("unauthenticated API returns 401", async ({ page }) => {
    const response = await page.request.get(`${EXCHANGE_URL}/api/v1/customers`);
    expect(response.status()).toBe(401);
  });

  test("auth bridge GET returns 405", async ({ page }) => {
    const response = await page.request.get(`${EXCHANGE_URL}/auth/bridge`);
    expect(response.status()).toBe(405);
  });
});
