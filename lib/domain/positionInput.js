const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NONNEGATIVE_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

function requireUuid(value) {
  if (!UUID_PATTERN.test(String(value ?? ""))) {
    throw new TypeError("Currency ID must be a valid UUID");
  }
  return value;
}

function requireNonnegativeDecimal(value, label) {
  const decimal = String(value ?? "").trim();
  if (!NONNEGATIVE_DECIMAL_PATTERN.test(decimal)) {
    throw new RangeError(`${label} must be a nonnegative decimal`);
  }
  return decimal;
}

function isZero(value) {
  return /^0(?:\.0+)?$/.test(value);
}

export function prepareOpeningPositionInput(input = {}) {
  const quantity = requireNonnegativeDecimal(input.quantity, "Quantity");
  const totalCost = requireNonnegativeDecimal(input.total_cost_local, "Total cost");
  const effectiveAt = input.effective_at;

  if (isZero(quantity) !== isZero(totalCost)) {
    throw new RangeError("Opening quantity and cost must both be zero or both be positive");
  }
  if (!effectiveAt || Number.isNaN(Date.parse(effectiveAt))) {
    throw new TypeError("Effective date must be a valid timestamp");
  }

  return {
    p_currency_id: requireUuid(input.currency_id),
    p_quantity: quantity,
    p_total_cost_local: totalCost,
    p_effective_at: effectiveAt,
  };
}
