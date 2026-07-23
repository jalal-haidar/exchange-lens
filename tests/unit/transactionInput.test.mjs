import test from "node:test";
import assert from "node:assert/strict";

import { prepareTransactionInput } from "../../lib/domain/transactionInput.js";

const ID = (suffix) => `123e4567-e89b-42d3-a456-4266141740${suffix}`;

test("trade posting preserves exact quantities, rates, accounts, and settlement", () => {
  assert.deepEqual(
    prepareTransactionInput({
      idempotency_key: ID("00"),
      type: "buy",
      customer_id: ID("01"),
      foreign_account_id: ID("02"),
      local_account_id: ID("03"),
      amount_foreign: "1250.25000001",
      rate: "279.1250000001",
      settled_amount_local: "100000.50",
      posted_at: "2026-07-21T13:00:00.000Z",
      description: "  Counter purchase  ",
    }),
    {
      p_idempotency_key: ID("00"),
      p_type: "buy",
      p_customer_id: ID("01"),
      p_foreign_account_id: ID("02"),
      p_local_account_id: ID("03"),
      p_amount_foreign: "1250.25000001",
      p_rate: "279.1250000001",
      p_settled_amount_local: "100000.50",
      p_description: "Counter purchase",
      p_reference_number: null,
      p_posted_at: "2026-07-21T13:00:00.000Z",
      p_replaces_transaction_id: null,
    },
  );
});

test("unpaid trade allows no PKR account", () => {
  const input = prepareTransactionInput({
    idempotency_key: ID("10"),
    type: "sell",
    customer_id: ID("11"),
    foreign_account_id: ID("12"),
    local_account_id: null,
    amount_foreign: "1",
    rate: "280",
    settled_amount_local: "0",
    posted_at: "2026-07-21T13:00:00.000Z",
  });
  assert.equal(input.p_local_account_id, null);
  assert.equal(input.p_settled_amount_local, "0");
});

test("legacy credit pseudo-transactions and excessive precision are rejected", () => {
  assert.throws(
    () => prepareTransactionInput({ type: "credit_given" }),
    /buy or sell/,
  );
  assert.throws(
    () => prepareTransactionInput({
      idempotency_key: ID("20"),
      type: "buy",
      customer_id: ID("21"),
      foreign_account_id: ID("22"),
      amount_foreign: "1.000000001",
      rate: "280",
      settled_amount_local: "0",
      posted_at: "2026-07-21T13:00:00.000Z",
    }),
    /8 decimal places/,
  );
});
