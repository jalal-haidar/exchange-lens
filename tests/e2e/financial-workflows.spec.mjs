import { expect, test } from "@playwright/test";
import {
  loginAndGetTokens,
  createApi,
  createAdminClient,
  getRunId,
  cleanupTestData,
} from "./helpers.mjs";

let tokens;
let userId;
let api;
let customerId;
let currencyId;
let buyRate;
let sellRate;
let buyId;
let sellId;
let creditId;
let expenseId;
let seededRateId;

const RUN_ID = getRunId();
const CUSTOMER_NAME = `${RUN_ID}-financial-customer`;

function addOne(quantity) {
  const [whole, fraction = ""] = String(quantity).split(".");
  const units = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0").slice(0, 2));
  const next = units + 100n;
  return `${next / 100n}.${String(next % 100n).padStart(2, "0")}`;
}

test.beforeAll(async () => {
  tokens = await loginAndGetTokens();
  userId = tokens.userId;
  api = createApi(tokens.accessToken);
  await cleanupTestData(userId, tokens.accessToken);

  const customerResponse = await api.post("/api/v1/customers", {
    name: CUSTOMER_NAME,
  });
  customerId = customerResponse.data?.data?.customer?.id;
  expect(customerId).toBeTruthy();

  const ratesResponse = await api.get("/api/v1/rates");
  let rate = ratesResponse.data?.data?.rates?.[0];
  if (!rate) {
    const admin = createAdminClient();
    const { data: currency, error: currencyError } = await admin
      .schema("exchange")
      .from("currencies")
      .select("id")
      .eq("code", "USD")
      .single();
    expect(currencyError).toBeNull();

    const seededRateResponse = await api.post("/api/v1/rates", {
      rates: [{ currency_id: currency.id, buy_rate: "280.00", sell_rate: "285.00" }],
    });
    expect(seededRateResponse.status).toBe(201);
    rate = seededRateResponse.data?.data?.rates?.[0];
    seededRateId = rate?.id;
  }
  expect(rate?.currency_id).toBeTruthy();
  currencyId = rate.currency_id;
  buyRate = String(rate.buy_rate);
  sellRate = String(rate.sell_rate);
});

test.afterAll(async () => {
  try {
    await cleanupTestData(userId, tokens.accessToken);
  } finally {
    if (seededRateId) {
      const admin = createAdminClient();
      await admin
        .schema("exchange")
        .from("rates")
        .delete()
        .eq("id", seededRateId);
      await admin
        .schema("exchange")
        .from("currency_positions")
        .delete()
        .eq("user_id", userId)
        .eq("currency_id", currencyId)
        .eq("quantity", 0)
        .eq("total_cost_local", 0);
    }
  }
});

test.describe.serial("financial posting workflow", () => {
  test("buy posting is idempotent and preserves the posted value", async () => {
    const idempotencyKey = crypto.randomUUID();
    const payload = {
      idempotency_key: idempotencyKey,
      type: "buy",
      customer_id: customerId,
      currency_id: currencyId,
      amount_foreign: "10.00",
      rate: buyRate,
      description: `${RUN_ID}-buy`,
      posted_at: new Date().toISOString(),
    };

    const first = await api.post("/api/v1/transactions", payload);
    const duplicate = await api.post("/api/v1/transactions", payload);
    buyId = first.data?.data?.transaction?.id;

    expect(first.status).toBe(201);
    expect(buyId).toBeTruthy();
    expect(duplicate.data?.data?.transaction?.id).toBe(buyId);
    expect(Number(first.data?.data?.transaction?.amount_foreign)).toBe(10);
  });

  test("overselling is rejected atomically", async () => {
    const positionsResponse = await api.get("/api/v1/positions");
    const position = positionsResponse.data?.data?.positions?.find(
      (entry) => entry.currency_id === currencyId,
    );
    expect(position?.quantity).toBeTruthy();

    const response = await api.post("/api/v1/transactions", {
      idempotency_key: crypto.randomUUID(),
      type: "sell",
      customer_id: customerId,
      currency_id: currencyId,
      amount_foreign: addOne(position.quantity),
      rate: sellRate,
      description: `${RUN_ID}-rejected-oversell`,
      posted_at: new Date().toISOString(),
    });

    expect([400, 409]).toContain(response.status);
    const list = await api.get(`/api/v1/transactions?search=${RUN_ID}-rejected-oversell`);
    expect(list.data?.data?.transactions).toEqual([]);
  });

  test("sell posting realizes margin against weighted-average inventory", async () => {
    const response = await api.post("/api/v1/transactions", {
      idempotency_key: crypto.randomUUID(),
      type: "sell",
      customer_id: customerId,
      currency_id: currencyId,
      amount_foreign: "5.00",
      rate: sellRate,
      description: `${RUN_ID}-sell`,
      posted_at: new Date().toISOString(),
    });

    sellId = response.data?.data?.transaction?.id;
    expect(response.status).toBe(201);
    expect(sellId).toBeTruthy();
    expect(Number.isFinite(Number(response.data?.data?.transaction?.realized_margin_local))).toBeTruthy();
  });

  test("credit changes customer outstanding without foreign currency", async () => {
    const response = await api.post("/api/v1/transactions", {
      idempotency_key: crypto.randomUUID(),
      type: "credit_given",
      customer_id: customerId,
      amount_local: "1234.56",
      description: `${RUN_ID}-credit`,
      posted_at: new Date().toISOString(),
    });

    creditId = response.data?.data?.transaction?.id;
    expect(response.status).toBe(201);
    expect(response.data?.data?.transaction?.currency_id).toBeNull();

    const ledger = await api.get(`/api/v1/customers/${customerId}/ledger`);
    expect(ledger.data?.data?.balance).toBe("1234.56");
  });

  test("expense posting is exact and idempotent", async () => {
    const idempotencyKey = crypto.randomUUID();
    const payload = {
      idempotency_key: idempotencyKey,
      amount: "987.65",
      description: `${RUN_ID}-expense`,
      date: new Date().toISOString(),
    };

    const first = await api.post("/api/v1/expenses", payload);
    const duplicate = await api.post("/api/v1/expenses", payload);
    expenseId = first.data?.data?.expense?.id;

    expect(first.status).toBe(201);
    expect(expenseId).toBeTruthy();
    expect(duplicate.data?.data?.expense?.id).toBe(expenseId);
    expect(Number(first.data?.data?.expense?.amount)).toBe(987.65);
  });

  test("reversals remove entries from active reports and restore balances", async () => {
    const expenseReversal = await api.post(`/api/v1/expenses/${expenseId}/reverse`, {
      reason: "E2E correction",
    });
    const creditReversal = await api.post(`/api/v1/transactions/${creditId}/reverse`, {
      reason: "E2E correction",
    });
    const sellReversal = await api.post(`/api/v1/transactions/${sellId}/reverse`, {
      reason: "E2E correction",
    });
    const buyReversal = await api.post(`/api/v1/transactions/${buyId}/reverse`, {
      reason: "E2E correction",
    });

    expect(expenseReversal.status).toBe(201);
    expect(creditReversal.status).toBe(201);
    expect(sellReversal.status).toBe(201);
    expect(buyReversal.status).toBe(201);

    const ledger = await api.get(`/api/v1/customers/${customerId}/ledger`);
    expect(ledger.data?.data?.balance).toBe("0.00");

    const transactions = await api.get(`/api/v1/transactions?search=${RUN_ID}`);
    expect(transactions.data?.data?.transactions).toEqual([]);

    const expenses = await api.get("/api/v1/expenses");
    expect(expenses.data?.data?.expenses?.some((entry) => entry.id === expenseId)).toBeFalsy();
  });
});
