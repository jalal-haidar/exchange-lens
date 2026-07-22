const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POSITIVE_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

function requireUUID(value, label) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new TypeError(`${label} must be a valid UUID`);
  }
  return value;
}

function requirePositiveDecimal(value, label) {
  const normalized = String(value ?? "").trim();
  if (!POSITIVE_DECIMAL_PATTERN.test(normalized) || Number(normalized) <= 0) {
    throw new RangeError(`${label} must be positive`);
  }
  return normalized;
}

function optionalText(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}

export function prepareTransactionInput(body) {
  const type = body?.type;
  const isCurrencyTrade = ["buy", "sell"].includes(type);

  if (![ "buy", "sell", "credit_given", "credit_received" ].includes(type)) {
    throw new TypeError("Invalid transaction type");
  }

  const postedAt = new Date(body.posted_at);
  if (Number.isNaN(postedAt.getTime())) {
    throw new TypeError("Posted time must be valid");
  }

  return {
    p_idempotency_key: requireUUID(body.idempotency_key, "Idempotency key"),
    p_type: type,
    p_customer_id: requireUUID(body.customer_id, "Customer ID"),
    p_amount_local: isCurrencyTrade
      ? null
      : requirePositiveDecimal(body.amount_local, "PKR amount"),
    p_currency_id: isCurrencyTrade
      ? requireUUID(body.currency_id, "Currency ID")
      : null,
    p_amount_foreign: isCurrencyTrade
      ? requirePositiveDecimal(body.amount_foreign, "Foreign amount")
      : null,
    p_rate: isCurrencyTrade
      ? requirePositiveDecimal(body.rate, "Rate")
      : null,
    p_description: optionalText(body.description),
    p_reference_number: optionalText(body.reference_number),
    p_posted_at: postedAt.toISOString(),
    p_replaces_transaction_id: body.replaces_transaction_id
      ? requireUUID(body.replaces_transaction_id, "Replacement transaction ID")
      : null,
  };
}
