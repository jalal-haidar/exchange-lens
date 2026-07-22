import { createClient } from "@supabase/supabase-js";

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TEST_USER_EMAIL",
  "TEST_USER_PASSWORD",
];
for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(`Missing required E2E environment variable: ${name}`);
  }
}

export const EXCHANGE_URL = process.env.E2E_BASE_URL || "http://localhost:3005";
export const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL || "http://localhost:3000";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createAnonClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function loginAndGetTokens() {
  const client = createAnonClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: process.env.TEST_USER_EMAIL,
    password: process.env.TEST_USER_PASSWORD,
  });
  if (error) throw new Error(`Login failed: ${error.message}`);
  const { data: access, error: accessError } = await client
    .schema("exchange")
    .rpc("get_access_context");
  if (accessError) throw new Error(`Exchange access setup failed: ${accessError.message}`);
  if (access?.state === "onboarding") {
    const { error: organizationError } = await client
      .schema("exchange")
      .rpc("create_organization", { p_name: "E2E QA Exchange" });
    if (organizationError) throw new Error(`Organization setup failed: ${organizationError.message}`);
  }
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    userId: data.user.id,
  };
}

export async function bridgeLogin(page, { accessToken, refreshToken }, redirect = "/dashboard") {
  const response = await page.request.fetch(`${EXCHANGE_URL}/auth/bridge`, {
    method: "POST",
    form: {
      access_token: accessToken,
      refresh_token: refreshToken,
      redirect,
    },
    maxRedirects: 0,
  });

  const cookieHeader = response.headers()["set-cookie"];
  if (cookieHeader) {
    const exchangeUrl = new URL(EXCHANGE_URL);
    const cookieName = cookieHeader.split("=")[0];
    const cookieValue = cookieHeader.split("=").slice(1).join("=").split(";")[0];
    await page.context().addCookies([
      {
        name: cookieName,
        value: cookieValue,
        domain: exchangeUrl.hostname,
        path: "/",
        secure: exchangeUrl.protocol === "https:",
      },
    ]);
  }

  await page.goto(`${EXCHANGE_URL}${redirect}`);
  if (redirect === "/") {
    await page.waitForURL((url) => url.pathname === "/dashboard", { timeout: 60_000 });
  } else {
    await page.waitForURL((url) => url.pathname === redirect, { timeout: 60_000 });
  }
}

export function createApi(accessToken) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  async function request(method, path, body) {
    const opts = { method, headers, signal: AbortSignal.timeout(30_000) };
    if (body && method !== "GET") {
      opts.body = JSON.stringify(body);
    }
    const response = await fetch(`${EXCHANGE_URL}${path}`, opts);
    let data = null;
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      data = await response.json();
    }
    return { status: response.status, ok: response.ok, data };
  }

  return {
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
    put: (path, body) => request("PUT", path, body),
    patch: (path, body) => request("PATCH", path, body),
    del: (path) => request("DELETE", path),
  };
}

let runId;
export function getRunId() {
  if (!runId) runId = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return runId;
}

export async function cleanupTestData(userId, accessToken) {
  const admin = createAdminClient();

  const { data: customers } = await admin
    .schema("exchange")
    .from("customers")
    .select("id")
    .eq("user_id", userId)
    .like("name", "e2e-%");

  if (customers?.length) {
    const ids = customers.map((c) => c.id);

    const { data: transactions } = await admin
      .schema("exchange")
      .from("transactions")
      .select("id, posted_at, created_at")
      .in("customer_id", ids)
      .order("posted_at", { ascending: false })
      .order("created_at", { ascending: false });

    const transactionIds = (transactions || []).map((transaction) => transaction.id);
    if (transactionIds.length && accessToken) {
      const { data: reversals } = await admin
        .schema("exchange")
        .from("transaction_reversals")
        .select("transaction_id")
        .in("transaction_id", transactionIds);
      const reversedIds = new Set((reversals || []).map((entry) => entry.transaction_id));
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });

      for (const transaction of transactions) {
        if (reversedIds.has(transaction.id)) continue;
        const { error } = await userClient
          .schema("exchange")
          .rpc("reverse_transaction", {
            p_transaction_id: transaction.id,
            p_reason: "E2E cleanup",
          });
        if (error) {
          throw new Error(`Failed to reverse E2E transaction ${transaction.id}: ${error.message}`);
        }
      }
    }

    if (transactionIds.length) {
      await admin
        .schema("exchange")
        .from("audit_events")
        .delete()
        .in("entity_id", transactionIds);

      await admin
        .schema("exchange")
        .from("transaction_reversals")
        .delete()
        .in("transaction_id", transactionIds);
    }

    await admin
      .schema("exchange")
      .from("transactions")
      .delete()
      .in("customer_id", ids);

    await admin
      .schema("exchange")
      .from("customers")
      .delete()
      .in("id", ids);
  }

  const { data: expenses } = await admin
    .schema("exchange")
    .from("expenses")
    .select("id")
    .eq("user_id", userId)
    .like("description", "e2e-%");

  const expenseIds = (expenses || []).map((expense) => expense.id);
  if (expenseIds.length) {
    await admin
      .schema("exchange")
      .from("audit_events")
      .delete()
      .in("entity_id", expenseIds);

    await admin
      .schema("exchange")
      .from("expense_reversals")
      .delete()
      .in("expense_id", expenseIds);

    await admin
      .schema("exchange")
      .from("expenses")
      .delete()
      .in("id", expenseIds);
  }
}
