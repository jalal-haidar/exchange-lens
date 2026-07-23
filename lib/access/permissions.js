export const Permissions = Object.freeze({
  ACCESS_READ: "access.read",
  ORGANIZATION_MANAGE: "organization.manage",
  MEMBERS_MANAGE: "members.manage",
  AUDIT_READ: "audit.read",
  EXPORTS_CREATE: "exports.create",
  FINANCIAL_REPORTS_READ: "reports.financial.read",
  OPENING_POSITIONS_MANAGE: "opening_positions.manage",
  POSITION_QUANTITY_READ: "positions.quantity.read",
  POSITION_COST_READ: "positions.cost.read",
  CUSTOMERS_DIRECTORY_READ: "customers.directory.read",
  CUSTOMERS_READ: "customers.read",
  CUSTOMERS_BALANCE_READ: "customers.balance.read",
  CUSTOMERS_MANAGE: "customers.manage",
  RATES_READ: "rates.read",
  RATES_MANAGE: "rates.manage",
  OPERATIONS_READ_ALL: "operations.read_all",
  TRANSACTIONS_READ_OWN: "transactions.read_own",
  TRANSACTIONS_POST: "transactions.post",
  TRANSACTIONS_REVERSE: "transactions.reverse",
  EXPENSES_READ_OWN: "expenses.read_own",
  EXPENSES_POST: "expenses.post",
  EXPENSES_REVERSE: "expenses.reverse",
  ACCOUNTS_READ: "accounts.read",
  ACCOUNTS_MANAGE: "accounts.manage",
  LEDGER_READ: "ledger.read",
  SETTLEMENTS_POST: "settlements.post",
  TRANSFERS_POST: "transfers.post",
  RECONCILIATIONS_PREPARE: "reconciliations.prepare",
  RECONCILIATIONS_CLOSE: "reconciliations.close",
  INTEGRITY_READ: "integrity.read",
});

export const Roles = Object.freeze({
  OWNER: "owner",
  MANAGER: "manager",
  OPERATOR: "operator",
  VIEWER: "viewer",
});

export const ASSIGNABLE_ROLES = Object.freeze([
  Roles.MANAGER,
  Roles.OPERATOR,
  Roles.VIEWER,
]);

export function hasPermission(access, permission) {
  return access?.state === "active" && access.permissions?.includes(permission);
}
