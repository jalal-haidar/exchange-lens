import { expect, test } from "@playwright/test";
import {
  bridgeLogin,
  EXCHANGE_URL,
  loginAndGetTokens,
} from "./helpers.mjs";

let tokens;

test.beforeAll(async () => {
  tokens = await loginAndGetTokens();
});

test("cashflow workspace shows balances and owner controls", async ({ page }) => {
  await bridgeLogin(page, tokens);
  await page.goto(`${EXCHANGE_URL}/cashflow`);
  await expect(page.getByRole("heading", { name: "Cashflow" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Customer receipt or payout" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Transfer between accounts" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Owner controls" })).toBeVisible();
  const integrityResponse = await page.request.get(`${EXCHANGE_URL}/api/v1/ledger/integrity`);
  const integrityBody = await integrityResponse.json();
  expect(
    integrityBody.data.integrity,
    JSON.stringify(integrityBody.data.integrity),
  ).toMatchObject({ ok: true });
  await page.getByRole("button", { name: "Run integrity check" }).click();
  await expect(page.getByText("Ledger checks passed")).toBeVisible();
});
