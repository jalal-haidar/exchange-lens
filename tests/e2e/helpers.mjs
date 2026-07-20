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

export const EXCHANGE_URL = "http://localhost:3005";
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
    const cookieName = cookieHeader.split("=")[0];
    const cookieValue = cookieHeader.split("=").slice(1).join("=").split(";")[0];
    await page.context().addCookies([
      {
        name: cookieName,
        value: cookieValue,
        domain: "localhost",
        path: "/",
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
    const opts = { method, headers };
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
    del: (path) => request("DELETE", path),
  };
}

let runId;
export function getRunId() {
  if (!runId) runId = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return runId;
}

export async function cleanupTestData(userId) {
  const admin = createAdminClient();

  const { data: customers } = await admin
    .schema("exchange")
    .from("customers")
    .select("id")
    .eq("user_id", userId)
    .like("name", "e2e-%");

  if (customers?.length) {
    const ids = customers.map((c) => c.id);

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

  await admin
    .schema("exchange")
    .from("expenses")
    .delete()
    .eq("user_id", userId)
    .like("description", "e2e-%");
}
