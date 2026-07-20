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
const CUSTOMER_NAME = `${RUN_ID}-tx-customer`;

test.beforeAll(async () => {
  tokens = await loginAndGetTokens();
  userId = tokens.userId;
  api = createApi(tokens.accessToken);
  await cleanupTestData(userId);

  const { data } = await api.post("/api/v1/customers", {
    name: CUSTOMER_NAME,
    phone: "+92-300-8888888",
  });
  expect(data?.data?.customer?.id).toBeTruthy();
});

test.afterAll(async () => {
  await cleanupTestData(userId);
});

test.describe.serial("transaction CRUD", () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await bridgeLogin(page, tokens);
  });

  test("transaction list page loads", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/transactions`);
    await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible();
    await expect(page.getByText("total transactions")).toBeVisible();
  });

  test("+ New Transaction button navigates", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/transactions`);
    const newBtn = page.getByText("+ New Transaction");
    await newBtn.waitFor({ state: "visible", timeout: 10_000 });
    await newBtn.evaluate((el) => el.click());
    await expect(page).toHaveURL(/\/transactions\/new/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "New Transaction" })).toBeVisible();
  });

  test("type pre-filled from URL — buy", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/transactions/new?type=buy`);
    await expect(page.getByRole("heading", { name: "New Transaction" })).toBeVisible();
    const buyBtn = page.getByText("Buy Currency").locator("..");
    await expect(buyBtn).toHaveAttribute("class", /border-success/);
  });

  test("type pre-filled from URL — sell", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/transactions/new?type=sell`);
    await expect(page.getByRole("heading", { name: "New Transaction" })).toBeVisible();
    const sellBtn = page.getByText("Sell Currency").locator("..");
    await expect(sellBtn).toHaveAttribute("class", /border-info/);
  });

  test("create buy transaction via API", async () => {
    const ratesResponse = await api.get("/api/v1/rates");
    const rates = ratesResponse.data?.data?.rates || [];
    expect(rates.length).toBeGreaterThan(0);

    const firstRate = rates[0];
    const customersResponse = await api.get(`/api/v1/customers?search=${CUSTOMER_NAME}`);
    const customers = customersResponse.data?.data?.customers || [];
    const customer = customers.find((c) => c.name === CUSTOMER_NAME);
    expect(customer).toBeTruthy();

    const response = await api.post("/api/v1/transactions", {
      type: "buy",
      customer_id: customer.id,
      currency_id: firstRate.currency_id,
      amount_foreign: 100,
      amount_local: 100 * firstRate.buy_rate,
      rate: firstRate.buy_rate,
      description: `E2E test buy ${RUN_ID}`,
    });

    expect(response.status).toBe(201);
    expect(response.data?.data?.transaction?.id).toBeTruthy();
  });

  test("create sell transaction via API", async () => {
    const ratesResponse = await api.get("/api/v1/rates");
    const rates = ratesResponse.data?.data?.rates || [];
    const firstRate = rates[0];

    const customersResponse = await api.get(`/api/v1/customers?search=${CUSTOMER_NAME}`);
    const customer = customersResponse.data?.data?.customers?.find((c) => c.name === CUSTOMER_NAME);

    const response = await api.post("/api/v1/transactions", {
      type: "sell",
      customer_id: customer.id,
      currency_id: firstRate.currency_id,
      amount_foreign: 50,
      amount_local: 50 * firstRate.sell_rate,
      rate: firstRate.sell_rate,
      description: `E2E test sell ${RUN_ID}`,
    });

    expect(response.status).toBe(201);
  });

  test("create credit transaction via API", async () => {
    const customersResponse = await api.get(`/api/v1/customers?search=${CUSTOMER_NAME}`);
    const customer = customersResponse.data?.data?.customers?.find((c) => c.name === CUSTOMER_NAME);
    const ratesResponse = await api.get("/api/v1/rates");
    const rates = ratesResponse.data?.data?.rates || [];
    const firstRate = rates[0];

    const response = await api.post("/api/v1/transactions", {
      type: "credit_given",
      customer_id: customer.id,
      currency_id: firstRate.currency_id,
      amount_local: 5000,
      description: `E2E test credit ${RUN_ID}`,
    });

    expect(response.status).toBe(201);
  });

  test("filter transactions by type", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/transactions`);
    await page.locator("select").selectOption("buy");
    const buyBadge = page.locator("span.rounded-md").filter({ hasText: "Buy" });
    await expect(buyBadge.first()).toBeVisible({ timeout: 15_000 });
  });

  test("search transactions", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/transactions`);
    await page.getByPlaceholder("Search transactions...").fill(RUN_ID);
    await expect(page.getByText(RUN_ID).first()).toBeVisible({ timeout: 15_000 });
  });

  test("form validation — empty form submission", async ({ page }) => {
    await page.goto(`${EXCHANGE_URL}/transactions/new`);
    await page.getByRole("button", { name: "Record Transaction" }).click();
    await expect(page.getByText("Customer is required")).toBeVisible();
  });
});
