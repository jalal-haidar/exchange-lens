import {
  optionalText,
  optionalUuid,
  requireDecimal,
  requireTimestamp,
  requireUuid,
} from "./ledgerInput.js";

export function prepareTransactionInput(body) {
  const type = body?.type;
  if (!["buy", "sell"].includes(type)) {
    throw new TypeError("Trade type must be buy or sell");
  }

  return {
    p_idempotency_key: requireUuid(body.idempotency_key, "Idempotency key"),
    p_type: type,
    p_customer_id: requireUuid(body.customer_id, "Customer ID"),
    p_foreign_account_id: requireUuid(body.foreign_account_id, "Foreign account"),
    p_local_account_id: optionalUuid(body.local_account_id, "PKR account"),
    p_amount_foreign: requireDecimal(body.amount_foreign, "Foreign amount", { scale: 8 }),
    p_rate: requireDecimal(body.rate, "Rate", { scale: 10 }),
    p_settled_amount_local: requireDecimal(
      body.settled_amount_local,
      "Settled amount",
      { scale: 2, allowZero: true },
    ),
    p_description: optionalText(body.description),
    p_reference_number: optionalText(body.reference_number, 120),
    p_posted_at: requireTimestamp(body.posted_at),
    p_replaces_transaction_id: optionalUuid(
      body.replaces_transaction_id,
      "Replacement transaction ID",
    ),
  };
}
