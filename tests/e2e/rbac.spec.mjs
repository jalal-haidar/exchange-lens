import { expect, test } from "@playwright/test";
import { createHash, randomBytes } from "node:crypto";
import {
  createAdminClient,
  createApi,
  bridgeLogin,
  getRunId,
  loginAndGetTokens,
  supabaseServiceKey,
  supabaseUrl,
} from "./helpers.mjs";

test.describe.serial("organization tenancy and role boundaries", () => {
  test.setTimeout(180_000);

  const runId = getRunId();
  const admin = createAdminClient();
  let tokens;
  let api;
  let organizationId;
  let originalRole;
  let roleTestCustomerId;
  let foreignOrganizationId;
  let foreignCustomerId;
  const invitationIds = [];
  let acceptanceStartedAt;

  async function setQaRole(role) {
    const { data, error } = await admin
      .schema("exchange")
      .from("organization_members")
      .update({ role })
      .eq("organization_id", organizationId)
      .eq("user_id", tokens.userId)
      .select("role")
      .single();
    if (error) throw error;
    expect(data.role).toBe(role);
  }

  test.beforeAll(async () => {
    tokens = await loginAndGetTokens();
    api = createApi(tokens.accessToken);
    const access = await api.get("/api/v1/access");
    expect(access.status).toBe(200);
    organizationId = access.data.access.organization.id;
    originalRole = access.data.access.role;

    const usersResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
      headers: { apikey: supabaseServiceKey, Authorization: `Bearer ${supabaseServiceKey}` },
    });
    const usersBody = await usersResponse.json();
    const { data: organizations } = await admin.schema("exchange").from("organizations").select("owner_user_id");
    const usedOwners = new Set((organizations || []).map((organization) => organization.owner_user_id));
    const foreignOwner = (usersBody.users || []).find((user) => user.id !== tokens.userId && !usedOwners.has(user.id));

    if (foreignOwner) {
      const { data: organization, error: organizationError } = await admin
        .schema("exchange")
        .from("organizations")
        .insert({ name: `${runId} Isolated Exchange`, owner_user_id: foreignOwner.id })
        .select("id")
        .single();
      if (organizationError) throw organizationError;
      foreignOrganizationId = organization.id;
      const { data: customer, error: customerError } = await admin
        .schema("exchange")
        .from("customers")
        .insert({
          user_id: foreignOwner.id,
          organization_id: foreignOrganizationId,
          created_by: foreignOwner.id,
          name: `${runId}-private-customer`,
        })
        .select("id")
        .single();
      if (customerError) throw customerError;
      foreignCustomerId = customer.id;
    }
  });

  test.afterAll(async () => {
    if (organizationId && tokens?.userId && originalRole) {
      await admin.schema("exchange").from("organization_members").update({ role: originalRole, status: "active" })
        .eq("organization_id", organizationId).eq("user_id", tokens.userId);
    }
    if (roleTestCustomerId) await admin.schema("exchange").from("customers").delete().eq("id", roleTestCustomerId);
    if (invitationIds.length) {
      await admin.schema("exchange").from("audit_events").delete().in("entity_id", invitationIds);
      await admin.schema("exchange").from("organization_invitations").delete().in("id", invitationIds);
    }
    if (acceptanceStartedAt) {
      await admin.schema("exchange").from("audit_events").delete()
        .eq("organization_id", organizationId)
        .eq("actor_user_id", tokens.userId)
        .eq("action", "invitation_accepted")
        .gte("created_at", acceptanceStartedAt);
    }
    if (foreignCustomerId) await admin.schema("exchange").from("customers").delete().eq("id", foreignCustomerId);
    if (foreignOrganizationId) await admin.schema("exchange").from("organizations").delete().eq("id", foreignOrganizationId);
  });

  test("owner can access team, audit, and financial reports", async () => {
    await setQaRole("owner");
    expect((await api.get("/api/v1/members")).status).toBe(200);
    expect((await api.get("/api/v1/audit")).status).toBe(200);
    expect((await api.get("/api/v1/reports/summary?date=2026-07-20")).status).toBe(200);

    const created = await api.post("/api/v1/invitations", {
      email: `${runId}-invite@example.test`,
      role: "viewer",
    });
    expect(created.status).toBe(201);
    invitationIds.push(created.data.invitation.id);
    expect(created.data.previewUrl).toContain("/invite/accept?token=");

    const resent = await api.post(`/api/v1/invitations/${created.data.invitation.id}`);
    expect(resent.status).toBe(200);
    invitationIds.push(resent.data.invitation.id);
    expect(resent.data.invitation.id).not.toBe(created.data.invitation.id);
    expect(resent.data.previewUrl).toContain("/invite/accept?token=");
    expect((await api.del(`/api/v1/invitations/${resent.data.invitation.id}`)).status).toBe(200);
  });

  test("operator can work but cannot open owner surfaces", async () => {
    await setQaRole("operator");
    const access = await api.get("/api/v1/access");
    expect(access.data.access.role).toBe("operator");
    expect((await api.get("/api/v1/reports/profit-loss?start_date=2026-07-01&end_date=2026-07-31")).status).toBe(403);
    expect((await api.get("/api/v1/members")).status).toBe(403);
    expect((await api.get("/api/v1/audit")).status).toBe(403);
    const customer = await api.post("/api/v1/customers", { name: `${runId}-operator-customer` });
    expect(customer.status).toBe(201);
    roleTestCustomerId = customer.data.data.customer.id;
  });

  test("matching signed-in user can accept a one-time invitation", async () => {
    await setQaRole("owner");
    const token = randomBytes(32).toString("base64url");
    acceptanceStartedAt = new Date().toISOString();
    const { data: invitation, error: invitationError } = await admin
      .schema("exchange")
      .from("organization_invitations")
      .insert({
        organization_id: organizationId,
        email: process.env.TEST_USER_EMAIL.toLowerCase(),
        role: "viewer",
        token_hash: createHash("sha256").update(token).digest("hex"),
        status: "pending",
        invited_by: tokens.userId,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();
    if (invitationError) throw invitationError;
    invitationIds.push(invitation.id);

    const { error: membershipError } = await admin
      .schema("exchange")
      .from("organization_members")
      .update({ status: "removed" })
      .eq("organization_id", organizationId)
      .eq("user_id", tokens.userId);
    if (membershipError) throw membershipError;

    const accepted = await api.post("/api/v1/invitations/accept", { token });
    expect(accepted.status).toBe(200);
    expect(accepted.data.member.role).toBe("viewer");
    expect((await api.get("/api/v1/access")).data.access.role).toBe("viewer");
    await setQaRole("owner");
  });

  test("organization RLS hides another business customer", async () => {
    test.skip(!foreignCustomerId, "No unused development auth user was available for an isolated fixture");
    const response = await api.get(`/api/v1/customers/${foreignCustomerId}`);
    expect(response.status).toBe(404);
  });

  test("viewer gets sanitized reads, no writes, and explicit restricted pages", async ({ page }) => {
    await setQaRole("viewer");
    const access = await api.get("/api/v1/access");
    expect(access.data.access.role).toBe("viewer");
    const customers = await api.get("/api/v1/customers");
    expect(customers.status).toBe(200);
    expect(customers.data.data.directoryRestricted).toBe(true);
    if (customers.data.data.customers.length) {
      expect(customers.data.data.customers[0]).not.toHaveProperty("email");
      expect(customers.data.data.customers[0]).not.toHaveProperty("notes");
    }
    expect((await api.post("/api/v1/customers", { name: "forbidden" })).status).toBe(403);
    expect((await api.get("/api/v1/transactions")).status).toBe(403);
    const positions = await api.get("/api/v1/positions");
    expect(positions.status).toBe(200);
    expect(positions.data.data.costRestricted).toBe(true);

    await bridgeLogin(page, tokens, "/reports");
    await expect(page.getByRole("heading", { name: "Access restricted" })).toBeVisible();
    await page.goto("/transactions/new");
    await expect(page.getByRole("heading", { name: "Access restricted" })).toBeVisible();
    await page.goto("/customers");
    await expect(page.getByRole("button", { name: "+ Add Customer" })).toHaveCount(0);
  });

  test("manager sees operations but still cannot access owner controls", async () => {
    await setQaRole("manager");
    expect((await api.get("/api/v1/transactions")).status).toBe(200);
    expect((await api.get("/api/v1/members")).status).toBe(403);
    expect((await api.get("/api/v1/reports/summary?date=2026-07-20")).status).toBe(403);
  });
});
