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
const RUN_ID = getRunId();
const CUSTOMER_NAME = `${RUN_ID}-api-customer`;

test.beforeAll(async () => {
  tokens = await loginAndGetTokens();
  userId = tokens.userId;
  api = createApi(tokens.accessToken);
  await cleanupTestData(userId);

  const { data } = await api.post("/api/v1/customers", {
    name: CUSTOMER_NAME,
    phone: "+92-300-6666666",
  });
  expect(data?.data?.customer?.id).toBeTruthy();
});

test.afterAll(async () => {
  await cleanupTestData(userId);
});

test.describe("dashboard stats API", () => {
  test("returns stats for today", async () => {
    const response = await api.get("/api/v1/dashboard/stats");
    expect(response.ok).toBeTruthy();
    const stats = response.data?.data?.stats;
    expect(stats).toBeDefined();
    expect(typeof stats.totalBuy).toBe("number");
    expect(typeof stats.totalSell).toBe("number");
    expect(typeof stats.totalExpenses).toBe("number");
    expect(typeof stats.profit).toBe("number");
    expect(typeof stats.totalCustomers).toBe("number");
    expect(typeof stats.pendingCredits).toBe("number");
    expect(typeof stats.transactionCount).toBe("number");
  });

  test("returns recent transactions array", async () => {
    const response = await api.get("/api/v1/dashboard/stats");
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
    expect(typeof response.data?.data?.balance).toBe("number");
  });

  test("returns 400 for invalid UUID", async () => {
    const response = await api.get("/api/v1/customers/not-a-uuid/ledger");
    expect(response.status).toBe(400);
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
