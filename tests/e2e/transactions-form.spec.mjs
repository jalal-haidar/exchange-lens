import { expect, test } from "@playwright/test";
import {
  EXCHANGE_URL,
  loginAndGetTokens,
  bridgeLogin,
  getRunId,
  cleanupTestData,
  createApi,
} from "./helpers.mjs";

let tokens;
let userId;
let api;
const RUN_ID = getRunId();
const CUSTOMER_NAME = `${RUN_ID}-form-customer`;

test.beforeAll(async () => {
  tokens = await loginAndGetTokens();
  userId = tokens.userId;
  api = createApi(tokens.accessToken);
  await cleanupTestData(userId, tokens.accessToken);

  const { data } = await api.post("/api/v1/customers", {
    name: CUSTOMER_NAME,
    phone: "+92-300-7777777",
  });
  expect(data?.data?.customer?.id).toBeTruthy();
});

test.afterAll(async () => {
  await cleanupTestData(userId, tokens.accessToken);
});

test.describe.serial("transaction form", () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await bridgeLogin(page, tokens);
  });

  test("new transaction page loads", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/transactions/new`);
    await expect(page.getByRole("heading", { name: "New Transaction" })).toBeVisible();
    await expect(page.getByText("Buy Currency")).toBeVisible();
    await expect(page.getByText("Sell Currency")).toBeVisible();
    await expect(page.getByText("Give Credit")).toHaveCount(0);
    await expect(page.getByText("Receive Payment")).toHaveCount(0);
    await expect(page.getByText("Settled now (PKR)")).toBeVisible();
  });

  test("type selector keeps account-backed trade fields", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/transactions/new`);

    await expect(page.locator("text=Customer *").locator("..").locator("select")).toBeVisible();
    await expect(page.locator("text=Foreign cash/bank account *").locator("..").locator("select")).toBeVisible();
    await page.getByText("Sell Currency").click();
    await expect(page.locator("text=Customer *").locator("..").locator("select")).toBeVisible();
    await expect(page.locator("text=Foreign cash/bank account *").locator("..").locator("select")).toBeVisible();
  });

  test("buy type shows correct description", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/transactions/new?type=buy`);
    await expect(page.getByText("Customer sells foreign currency to you")).toBeVisible();
  });

  test("sell type shows correct description", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/transactions/new?type=sell`);
    await expect(page.getByText("Customer buys foreign currency from you")).toBeVisible();
  });

  test("form validation — empty form submission", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/transactions/new`);
    await page.getByRole("button", { name: "Record Transaction" }).click();
    await expect(page.getByText("Customer is required")).toBeVisible();
    await expect(page.getByText("Amount is required", { exact: true })).toBeVisible();
    await expect(page.getByText("Foreign account is required")).toBeVisible();
  });

  test("form validation — buy without custody account", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/transactions/new?type=buy`);
    const customerSelect = page.locator("text=Customer *").locator("..").locator("select");
    await customerSelect.selectOption({ index: 1 });
    await page.getByRole("button", { name: "Record Transaction" }).click();
    await expect(page.getByText("Foreign account is required")).toBeVisible();
  });

  test("cancel button navigates back", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/transactions`);
    await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible();
    await page.goto(`${EXCHANGE_URL}/transactions/new`);
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(/\/transactions$/, { timeout: 10_000 });
  });
});
