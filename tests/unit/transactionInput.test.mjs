import test from "node:test";
import assert from "node:assert/strict";

import { prepareTransactionInput } from "../../lib/domain/transactionInput.js";

test("PKR credit posting does not require a foreign currency", () => {
  assert.deepEqual(
    prepareTransactionInput({
      idempotency_key: "123e4567-e89b-42d3-a456-426614174000",
      type: "credit_given",
      customer_id: "123e4567-e89b-42d3-a456-426614174001",
      amount_local: "12500.50",
      posted_at: "2026-07-21T12:30:00.000Z",
    }),
    {
      p_idempotency_key: "123e4567-e89b-42d3-a456-426614174000",
      p_type: "credit_given",
      p_customer_id: "123e4567-e89b-42d3-a456-426614174001",
      p_amount_local: "12500.50",
      p_currency_id: null,
      p_amount_foreign: null,
      p_rate: null,
      p_description: null,
      p_reference_number: null,
      p_posted_at: "2026-07-21T12:30:00.000Z",
      p_replaces_transaction_id: null,
    },
  );
});

test("currency trade posting preserves exact quantity and rate strings", () => {
  assert.deepEqual(
    prepareTransactionInput({
      idempotency_key: "123e4567-e89b-42d3-a456-426614174010",
      type: "buy",
      customer_id: "123e4567-e89b-42d3-a456-426614174011",
      currency_id: "123e4567-e89b-42d3-a456-426614174012",
      amount_foreign: "1250.25",
      rate: "279.125000",
      posted_at: "2026-07-21T13:00:00.000Z",
      description: "  Counter purchase  ",
    }),
    {
      p_idempotency_key: "123e4567-e89b-42d3-a456-426614174010",
      p_type: "buy",
      p_customer_id: "123e4567-e89b-42d3-a456-426614174011",
      p_amount_local: null,
      p_currency_id: "123e4567-e89b-42d3-a456-426614174012",
      p_amount_foreign: "1250.25",
      p_rate: "279.125000",
      p_description: "Counter purchase",
      p_reference_number: null,
      p_posted_at: "2026-07-21T13:00:00.000Z",
      p_replaces_transaction_id: null,
    },
  );
});
