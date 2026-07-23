import { expect, test } from "@playwright/test";
import {
  createAdminClient,
  createApi,
  getRunId,
  loginAndGetTokens,
} from "./helpers.mjs";

let api;
let pkrAccount;
let usdAccount;
let customerId;
let admin;
let userId;
let organizationId;
let usdCurrencyId;

const RUN_ID = getRunId();

test.beforeAll(async () => {
  const tokens = await loginAndGetTokens();
  userId = tokens.userId;
  api = createApi(tokens.accessToken);
  admin = createAdminClient();
  const accessResponse = await api.get("/api/v1/access");
  organizationId = accessResponse.data?.access?.organization?.id
    || accessResponse.data?.data?.access?.organization?.id;
  expect(organizationId).toBeTruthy();

  const accountsResponse = await api.get("/api/v1/accounts");
  expect(accountsResponse.status).toBe(200);
  let accounts = accountsResponse.data?.data?.accounts || [];
  const currencies = accountsResponse.data?.data?.currencies || [];
  const pkr = currencies.find((currency) => currency.code === "PKR");
  let usd = currencies.find((currency) => currency.code === "USD");
  if (!usd) {
    const { data } = await admin
      .schema("exchange")
      .from("currencies")
      .select("id, code")
      .eq("code", "USD")
      .single();
    usd = data;
  }
  expect(pkr?.id).toBeTruthy();
  expect(usd?.id).toBeTruthy();
  usdCurrencyId = usd.id;

  pkrAccount = accounts.find((account) => account.code === "E2E_PKR");
  if (!pkrAccount) {
    const response = await api.post("/api/v1/accounts", {
      name: "E2E PKR cash",
      code: "E2E_PKR",
      currency_id: pkr.id,
      account_kind: "cash",
    });
    expect(response.status).toBe(201);
    pkrAccount = response.data.data.account;
    const opening = await api.post("/api/v1/accounts/opening-balance", {
      account_id: pkrAccount.id,
      balance: "1000000.00",
      cost_local: "1000000.00",
      effective_at: new Date().toISOString(),
      idempotency_key: crypto.randomUUID(),
    });
    expect(opening.status).toBe(200);
  }

  usdAccount = accounts.find((account) => account.code === "E2E_USD");
  if (!usdAccount) {
    const response = await api.post("/api/v1/accounts", {
      name: "E2E USD cash",
      code: "E2E_USD",
      currency_id: usd.id,
      account_kind: "cash",
    });
    expect(response.status).toBe(201);
    usdAccount = response.data.data.account;
    const opening = await api.post("/api/v1/accounts/opening-balance", {
      account_id: usdAccount.id,
      balance: "1000.00",
      cost_local: "280000.00",
      effective_at: new Date().toISOString(),
      idempotency_key: crypto.randomUUID(),
    });
    expect(opening.status).toBe(200);
  }

  const complete = await api.post("/api/v1/accounts/complete-setup", {});
  expect(complete.status).toBe(200);
  const refreshedAccounts = await api.get("/api/v1/accounts");
  accounts = refreshedAccounts.data?.data?.accounts || [];
  pkrAccount = accounts.find((account) => account.code === "E2E_PKR");
  usdAccount = accounts.find((account) => account.code === "E2E_USD");

  const customer = await api.post("/api/v1/customers", {
    name: `${RUN_ID}-ledger-customer`,
  });
  expect(customer.status).toBe(201);
  customerId = customer.data.data.customer.id;
});

test.describe.serial("operational ledger workflow", () => {
  test("concurrent idempotent trade retries create one journal-backed trade", async () => {
    const payload = {
      idempotency_key: crypto.randomUUID(),
      type: "buy",
      customer_id: customerId,
      foreign_account_id: usdAccount.id,
      local_account_id: pkrAccount.id,
      amount_foreign: "2.00",
      rate: "280.00",
      settled_amount_local: "300.00",
      description: `${RUN_ID}-partial-buy`,
      posted_at: new Date().toISOString(),
    };
    const [first, retry] = await Promise.all([
      api.post("/api/v1/transactions", payload),
      api.post("/api/v1/transactions", payload),
    ]);
    expect(first.status, JSON.stringify(first.data)).toBe(201);
    expect(retry.status, JSON.stringify(retry.data)).toBe(201);
    expect(retry.data.data.transaction.id).toBe(first.data.data.transaction.id);
    expect(first.data.data.transaction.settlement_status).toBe("partial");
    expect(first.data.data.transaction.journal_entry_id).toBeTruthy();

    const settlement = await api.post("/api/v1/settlements", {
      idempotency_key: crypto.randomUUID(),
      customer_id: customerId,
      account_id: pkrAccount.id,
      direction: "payout",
      amount_local: "260.00",
      allocations: [{
        transaction_id: first.data.data.transaction.id,
        amount: "260.00",
      }],
      description: `${RUN_ID}-final-payment`,
      posted_at: new Date().toISOString(),
    });
    expect(settlement.status).toBe(201);
    expect(Number(settlement.data.data.settlement.allocated_amount)).toBe(260);
  });

  test("customer statement includes journal-backed trades and settlements", async () => {
    const ledger = await api.get(`/api/v1/customers/${customerId}/ledger`);
    expect(ledger.status, JSON.stringify(ledger.data)).toBe(200);
    expect(ledger.data.data.ledger.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(["buy", "payout"]),
    );
    expect(Number(ledger.data.data.balance)).toBe(0);
    for (const entry of ledger.data.data.ledger) {
      expect(typeof entry.amount_local).toBe("string");
      expect(typeof entry.balance_delta).toBe("string");
      expect(typeof entry.running_balance).toBe("string");
    }

    const report = await api.get(
      `/api/v1/reports/customer?customer_id=${customerId}`,
    );
    expect(report.status, JSON.stringify(report.data)).toBe(200);
    expect(Number(report.data.data.summary.finalBalance)).toBe(0);
    expect(report.data.data.statement.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(["buy", "payout"]),
    );
  });

  test("overspending and altered idempotency retries are rejected", async () => {
    const key = crypto.randomUUID();
    const base = {
      idempotency_key: key,
      type: "buy",
      customer_id: customerId,
      foreign_account_id: usdAccount.id,
      local_account_id: pkrAccount.id,
      amount_foreign: "1.00",
      rate: "280.00",
      settled_amount_local: "280.00",
      posted_at: new Date().toISOString(),
    };
    const first = await api.post("/api/v1/transactions", base);
    const altered = await api.post("/api/v1/transactions", {
      ...base,
      amount_foreign: "2.00",
    });
    expect(first.status).toBe(201);
    expect(altered.status).toBe(409);

    const expense = await api.post("/api/v1/expenses", {
      idempotency_key: crypto.randomUUID(),
      account_id: pkrAccount.id,
      amount: "999999999.00",
      description: `${RUN_ID}-rejected-expense`,
      date: new Date().toISOString(),
    });
    expect(expense.status).toBe(409);
  });

  test("server-side daily aggregation includes more than 1,000 rows", async () => {
    const marker = `${RUN_ID}-volume`;
    const postedAt = new Date().toISOString();
    const rows = Array.from({ length: 1205 }, () => ({
      user_id: userId,
      organization_id: organizationId,
      created_by: userId,
      customer_id: customerId,
      currency_id: usdCurrencyId,
      type: "buy",
      amount_foreign: "1.00",
      amount_local: "1.00",
      rate: "1.00",
      description: marker,
      idempotency_key: crypto.randomUUID(),
      posted_at: postedAt,
    }));
    try {
      for (let offset = 0; offset < rows.length; offset += 400) {
        const { error } = await admin
          .schema("exchange")
          .from("transactions")
          .insert(rows.slice(offset, offset + 400));
        expect(error).toBeNull();
      }
      const date = postedAt.slice(0, 10);
      const report = await api.get(
        `/api/v1/reports/summary?date=${date}&timezone=UTC`,
      );
      expect(report.status).toBe(200);
      expect(Number(report.data.data.summary.totalBuy)).toBeGreaterThanOrEqual(1205);
      expect(report.data.data.transactionsTruncated).toBe(true);
    } finally {
      await admin
        .schema("exchange")
        .from("transactions")
        .delete()
        .eq("organization_id", organizationId)
        .eq("description", marker);
    }
  });

  test("owner integrity check reports a balanced ledger", async () => {
    const response = await api.get("/api/v1/ledger/integrity");
    expect(response.status).toBe(200);
    expect(response.data.data.integrity).toMatchObject({
      ok: true,
      unbalanced_entries: 0,
      negative_blocked_accounts: 0,
      missing_journals: 0,
      position_mismatches: 0,
    });
  });
});
