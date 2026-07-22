import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSIGNABLE_ROLES,
  Permissions,
  Roles,
  hasPermission,
} from "../../lib/access/permissions.js";

test("active access grants only explicitly returned permissions", () => {
  const access = { state: "active", permissions: [Permissions.RATES_READ] };
  assert.equal(hasPermission(access, Permissions.RATES_READ), true);
  assert.equal(hasPermission(access, Permissions.FINANCIAL_REPORTS_READ), false);
});

test("onboarding and removed access never grant cached permissions", () => {
  assert.equal(hasPermission({ state: "onboarding", permissions: [Permissions.RATES_READ] }, Permissions.RATES_READ), false);
  assert.equal(hasPermission(null, Permissions.RATES_READ), false);
});

test("owner is not an assignable staff role", () => {
  assert.deepEqual(ASSIGNABLE_ROLES, [Roles.MANAGER, Roles.OPERATOR, Roles.VIEWER]);
  assert.equal(ASSIGNABLE_ROLES.includes(Roles.OWNER), false);
});
