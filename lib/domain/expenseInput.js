import {
  optionalText,
  optionalUuid,
  requireDecimal,
  requireTimestamp,
  requireUuid,
} from "./ledgerInput.js";

export function prepareExpenseInput(input = {}) {
  const categoryId = input.category_id || null;
  const idempotencyKey = requireUuid(input.idempotency_key, "Idempotency key");
  if (categoryId) {
    requireUuid(categoryId, "Category ID");
  }

  return {
    p_amount: requireDecimal(input.amount, "Amount", { scale: 2 }),
    p_account_id: requireUuid(input.account_id, "Payment account"),
    p_category_id: categoryId,
    p_description: optionalText(input.description),
    p_date: requireTimestamp(input.date, "Expense date"),
    p_idempotency_key: idempotencyKey,
  };
}
