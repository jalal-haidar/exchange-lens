import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test.skip(process.env.E2E_ENV !== "production", "Production-only disposable tenant smoke");

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3005";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let admin;
let accessToken;
let userId;
let organizationId;
let deleteDisposableUser = false;
let existingQaOrganization = false;
let cleanupAllowed = false;

async function api(method, path, body) {
  const response = await fetch(`${baseURL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json();
  return { response, payload };
}

async function retry(operation, attempts = 3) {
  let result;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    result = await operation();
    if (!result.error) return result;
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  return result;
}

async function cleanup() {
  if (!admin || !organizationId || !cleanupAllowed) return;
  const deleteByOrganization = async (table) => {
    await admin.schema("exchange").from(table).delete().eq("organization_id", organizationId);
  };
  await deleteByOrganization("settlement_allocations");
  await deleteByOrganization("customer_settlements");
  await deleteByOrganization("account_transfers");
  await deleteByOrganization("account_reconciliations");
  await deleteByOrganization("business_day_closures");
  await deleteByOrganization("transaction_reversals");
  await deleteByOrganization("expense_reversals");
  await deleteByOrganization("audit_events");
  await deleteByOrganization("transactions");
  await deleteByOrganization("expenses");
  await deleteByOrganization("journal_lines");
  await deleteByOrganization("journal_entries");
  await deleteByOrganization("currency_positions");
  await deleteByOrganization("financial_accounts");
  await deleteByOrganization("rates");
  await deleteByOrganization("expense_categories");
  await deleteByOrganization("customers");
  await deleteByOrganization("organization_invitations");
  await deleteByOrganization("organization_members");
  await admin.schema("exchange").from("organizations").delete().eq("id", organizationId);
  organizationId = null;
}

test.beforeAll(async () => {
  expect(supabaseUrl).toBeTruthy();
  expect(anonKey).toBeTruthy();
  expect(serviceKey).toBeTruthy();
  admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `exchange-ledger-${Date.now()}@example.com`;
  const password = `Smoke-${crypto.randomUUID()}!`;
  let created = null;
  let createError = null;
  if (process.env.DISPOSABLE_USER_PROVISIONED === "true") {
    createError = new Error("Disposable user was provisioned by the test runner");
  } else {
    ({ data: created, error: createError } = await retry(
      () => admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      }),
    ));
  }
  const anon = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let login;
  let loginError;
  if (!createError) {
    userId = created.user.id;
    deleteDisposableUser = true;
    cleanupAllowed = true;
    ({ data: login, error: loginError } = await retry(
      () => anon.auth.signInWithPassword({ email, password }),
    ));
  } else {
    expect(process.env.TEST_USER_EMAIL).toBeTruthy();
    expect(process.env.TEST_USER_PASSWORD).toBeTruthy();
    ({ data: login, error: loginError } = await retry(
      () => anon.auth.signInWithPassword({
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      }),
    ));
    userId = login?.user?.id;
    const { data: existingAccess, error: accessError } = await anon
      .schema("exchange")
      .rpc("get_access_context");
    expect(accessError).toBeNull();
    if (existingAccess?.state === "active") {
      existingQaOrganization = true;
      organizationId = existingAccess.organization.id;
    } else {
      expect(existingAccess?.state).toBe("onboarding");
    }
  }
  expect(loginError).toBeNull();
  accessToken = login.session.access_token;
  if (!existingQaOrganization) {
    const { data: organization, error: organizationError } = await anon
      .schema("exchange")
      .rpc("create_organization", { p_name: `Disposable ledger ${Date.now()}` });
    expect(organizationError).toBeNull();
    organizationId = organization.id;
    cleanupAllowed = true;
  }
});

test.afterAll(async () => {
  try {
    await cleanup();
  } finally {
    if (deleteDisposableUser && userId) await admin.auth.admin.deleteUser(userId);
  }
});

test("production ledger posts and balances in a disposable tenant", async () => {
  if (existingQaOrganization) {
    const [accounts, transactions, expenses, customers] = await Promise.all([
      api("GET", "/api/v1/accounts"),
      api("GET", "/api/v1/transactions?limit=1"),
      api("GET", "/api/v1/expenses"),
      api("GET", "/api/v1/customers?limit=1"),
    ]);
    const hasData = (accounts.payload.data?.accounts?.length || 0) > 0
      || (transactions.payload.data?.transactions?.length || 0) > 0
      || (expenses.payload.data?.expenses?.length || 0) > 0
      || (customers.payload.data?.customers?.length || 0) > 0;
    test.skip(
      hasData,
      "Production QA organization contains data and was not mutated",
    );
    cleanupAllowed = true;
  }

  const { data: currencies, error: currencyError } = await admin
    .schema("exchange")
    .from("currencies")
    .select("id, code")
    .in("code", ["PKR", "USD"]);
  expect(currencyError).toBeNull();
  const pkr = currencies.find((currency) => currency.code === "PKR");
  const usd = currencies.find((currency) => currency.code === "USD");

  const pkrCreate = await api("POST", "/api/v1/accounts", {
    name: "Disposable PKR cash",
    code: "SMOKE_PKR",
    currency_id: pkr.id,
    account_kind: "cash",
  });
  expect(pkrCreate.response.status, JSON.stringify(pkrCreate.payload)).toBe(201);
  const usdCreate = await api("POST", "/api/v1/accounts", {
    name: "Disposable USD cash",
    code: "SMOKE_USD",
    currency_id: usd.id,
    account_kind: "cash",
  });
  expect(usdCreate.response.status, JSON.stringify(usdCreate.payload)).toBe(201);
  const pkrAccount = pkrCreate.payload.data.account;
  const usdAccount = usdCreate.payload.data.account;

  for (const [account, balance, cost] of [
    [pkrAccount, "100000.00", "100000.00"],
    [usdAccount, "100.00", "28000.00"],
  ]) {
    const opening = await api("POST", "/api/v1/accounts/opening-balance", {
      account_id: account.id,
      balance,
      cost_local: cost,
      effective_at: new Date().toISOString(),
      idempotency_key: crypto.randomUUID(),
    });
    expect(opening.response.status, JSON.stringify(opening.payload)).toBe(200);
  }
  const setup = await api("POST", "/api/v1/accounts/complete-setup", {});
  expect(setup.response.status, JSON.stringify(setup.payload)).toBe(200);

  const customer = await api("POST", "/api/v1/customers", {
    name: "Disposable smoke customer",
  });
  expect(customer.response.status).toBe(201);
  const trade = await api("POST", "/api/v1/transactions", {
    idempotency_key: crypto.randomUUID(),
    type: "buy",
    customer_id: customer.payload.data.customer.id,
    foreign_account_id: usdAccount.id,
    local_account_id: pkrAccount.id,
    amount_foreign: "1.00",
    rate: "280.00",
    settled_amount_local: "280.00",
    posted_at: new Date().toISOString(),
  });
  expect(trade.response.status, JSON.stringify(trade.payload)).toBe(201);
  expect(trade.payload.data.transaction.journal_entry_id).toBeTruthy();

  const integrity = await api("GET", "/api/v1/ledger/integrity");
  expect(integrity.response.status).toBe(200);
  expect(integrity.payload.data.integrity).toMatchObject({
    ok: true,
    unbalanced_entries: 0,
    negative_blocked_accounts: 0,
    missing_journals: 0,
    position_mismatches: 0,
  });
});
