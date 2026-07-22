import { expect, test } from "@playwright/test";
import {
  EXCHANGE_URL,
  loginAndGetTokens,
  createApi,
  getRunId,
  cleanupTestData,
} from "./helpers.mjs";

let tokens;
let userId;
let api;
let customerId;
const RUN_ID = getRunId();
const CUSTOMER_NAME = `${RUN_ID}-api-customer`;

test.beforeAll(async () => {
  tokens = await loginAndGetTokens();
  userId = tokens.userId;
  api = createApi(tokens.accessToken);
  await cleanupTestData(userId, tokens.accessToken);

  const { data } = await api.post("/api/v1/customers", {
    name: CUSTOMER_NAME,
    phone: "+92-300-6666666",
  });
  customerId = data?.data?.customer?.id;
  expect(customerId).toBeTruthy();
});

test.afterAll(async () => {
  await cleanupTestData(userId, tokens.accessToken);
});

test.describe("dashboard stats API", () => {
  test("returns stats for today", async () => {
    const date = new Date().toLocaleDateString("en-CA");
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const response = await api.get(`/api/v1/dashboard/stats?date=${date}&timezone=${encodeURIComponent(timezone)}`);
    expect(response.ok).toBeTruthy();
    const stats = response.data?.data?.stats;
    expect(stats).toBeDefined();
    expect(typeof stats.totalBuy).toBe("string");
    expect(typeof stats.totalSell).toBe("string");
    expect(typeof stats.totalExpenses).toBe("string");
    expect(typeof stats.realizedProfit).toBe("string");
    expect(typeof stats.totalCustomers).toBe("number");
    expect(typeof stats.pendingCredits).toBe("string");
    expect(typeof stats.transactionCount).toBe("number");
  });

  test("returns recent transactions array", async () => {
    const date = new Date().toLocaleDateString("en-CA");
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const response = await api.get(`/api/v1/dashboard/stats?date=${date}&timezone=${encodeURIComponent(timezone)}`);
    expect(response.ok).toBeTruthy();
    const txs = response.data?.data?.recentTransactions;
    expect(Array.isArray(txs)).toBeTruthy();
  });
});

test.describe("customer ledger API", () => {
  test("returns ledger for customer", async () => {
    const customersRes = await api.get(`/api/v1/customers?search=${CUSTOMER_NAME}`);
    const customer = customersRes.data?.data?.customers?.find((c) => c.name === CUSTOMER_NAME);
    expect(customer).toBeTruthy();

    const response = await api.get(`/api/v1/customers/${customer.id}/ledger`);
    expect(response.ok).toBeTruthy();
    expect(response.data?.data?.ledger).toBeDefined();
    expect(Array.isArray(response.data?.data?.ledger)).toBeTruthy();
    expect(typeof response.data?.data?.balance).toBe("string");
  });

  test("returns 400 for invalid UUID", async () => {
    const response = await api.get("/api/v1/customers/not-a-uuid/ledger");
    expect(response.status).toBe(400);
  });
});

test.describe("customer lifecycle API", () => {
  test("deactivation preserves history but hides the customer from active lists", async () => {
    const inactiveName = `${RUN_ID}-inactive-customer`;
    const created = await api.post("/api/v1/customers", { name: inactiveName });
    const inactiveId = created.data?.data?.customer?.id;
    expect(inactiveId).toBeTruthy();

    const deactivated = await api.del(`/api/v1/customers/${inactiveId}`);
    expect(deactivated.status).toBe(200);

    const activeList = await api.get(`/api/v1/customers?search=${inactiveName}`);
    expect(activeList.data?.data?.customers).toEqual([]);

    const inactiveList = await api.get(`/api/v1/customers?search=${inactiveName}&is_active=false`);
    expect(inactiveList.data?.data?.customers?.map((customer) => customer.id)).toContain(inactiveId);
  });

  test("customer report uses the exact credit-only balance contract", async () => {
    const response = await api.get(`/api/v1/reports/customer?customer_id=${customerId}`);
    expect(response.ok).toBeTruthy();
    expect(typeof response.data?.data?.summary?.finalBalance).toBe("string");
  });
});

test.describe("rates latest API", () => {
  test("returns deduplicated latest rates", async () => {
    const response = await api.get("/api/v1/rates/latest");
    expect(response.ok).toBeTruthy();
    const rates = response.data?.data?.rates;
    expect(Array.isArray(rates)).toBeTruthy();
    if (rates.length > 0) {
      expect(rates[0].currency_id).toBeTruthy();
      expect(rates[0].buy_rate).toBeTruthy();
      expect(rates[0].sell_rate).toBeTruthy();
    }
  });
});

test.describe("expense categories API", () => {
  let categoryId;

  test("GET returns categories array", async () => {
    const response = await api.get("/api/v1/expenses/categories");
    expect(response.ok).toBeTruthy();
    expect(Array.isArray(response.data?.data?.categories)).toBeTruthy();
  });

  test("POST creates a new category", async () => {
    const response = await api.post("/api/v1/expenses/categories", {
      name: `${RUN_ID}-category`,
    });
    expect(response.ok).toBeTruthy();
    expect(response.status).toBe(201);
    categoryId = response.data?.data?.category?.id;
    expect(categoryId).toBeTruthy();
  });

  test("POST rejects empty name", async () => {
    const response = await api.post("/api/v1/expenses/categories", {
      name: "   ",
    });
    expect(response.status).toBe(400);
  });

  test.afterAll(async () => {
    if (categoryId) {
      const admin = (
        await import("./helpers.mjs")
      ).createAdminClient();
      await admin
        .schema("exchange")
        .from("expense_categories")
        .delete()
        .eq("id", categoryId);
    }
  });
});

test.describe("unauthenticated API returns 401", () => {
  test("health endpoint remains public", async () => {
    const response = await fetch(`${EXCHANGE_URL}/api/health`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  test("dashboard stats without token", async () => {
    const response = await fetch(`${EXCHANGE_URL}/api/v1/dashboard/stats`);
    expect(response.status).toBe(401);
  });

  test("rates latest without token", async () => {
    const response = await fetch(`${EXCHANGE_URL}/api/v1/rates/latest`);
    expect(response.status).toBe(401);
  });

  test("expense categories without token", async () => {
    const response = await fetch(`${EXCHANGE_URL}/api/v1/expenses/categories`);
    expect(response.status).toBe(401);
  });
});
