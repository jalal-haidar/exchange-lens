const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POSITIVE_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

function requireUuid(value, label) {
  if (!UUID_PATTERN.test(String(value ?? ""))) {
    throw new TypeError(`${label} must be a valid UUID`);
  }

  return value;
}

function requirePositiveDecimal(value, label) {
  const decimal = String(value ?? "").trim();
  if (!POSITIVE_DECIMAL_PATTERN.test(decimal) || /^0(?:\.0+)?$/.test(decimal)) {
    throw new RangeError(`${label} must be a positive decimal`);
  }

  return decimal;
}

function requireTimestamp(value) {
  if (!value || Number.isNaN(Date.parse(value))) {
    throw new TypeError("Expense date must be a valid timestamp");
  }

  return value;
}

export function prepareExpenseInput(input = {}) {
  const categoryId = input.category_id || null;
  const idempotencyKey = requireUuid(input.idempotency_key, "Idempotency key");
  if (categoryId) {
    requireUuid(categoryId, "Category ID");
  }

  return {
    p_amount: requirePositiveDecimal(input.amount, "Amount"),
    p_category_id: categoryId,
    p_description: input.description?.trim() || null,
    p_date: requireTimestamp(input.date),
    p_idempotency_key: idempotencyKey,
  };
}
