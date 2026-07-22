import assert from "node:assert/strict";
import test from "node:test";

import { prepareExpenseInput } from "../../lib/domain/expenseInput.js";

const CATEGORY_ID = "11111111-1111-4111-8111-111111111111";
const IDEMPOTENCY_KEY = "22222222-2222-4222-8222-222222222222";

test("expense input preserves exact decimal strings for the posting RPC", () => {
  assert.deepEqual(
    prepareExpenseInput({
      amount: "1234.50",
      category_id: CATEGORY_ID,
      description: "Office supplies",
      date: "2026-07-21T14:30:00.000Z",
      idempotency_key: IDEMPOTENCY_KEY,
    }),
    {
      p_amount: "1234.50",
      p_category_id: CATEGORY_ID,
      p_description: "Office supplies",
      p_date: "2026-07-21T14:30:00.000Z",
      p_idempotency_key: IDEMPOTENCY_KEY,
    },
  );
});

test("expense input accepts an uncategorized expense", () => {
  assert.equal(
    prepareExpenseInput({
      amount: "1.01",
      category_id: null,
      date: "2026-07-21T14:30:00.000Z",
      idempotency_key: IDEMPOTENCY_KEY,
    }).p_category_id,
    null,
  );
});

test("expense input rejects malformed values", () => {
  assert.throws(
    () => prepareExpenseInput({ amount: "0", idempotency_key: IDEMPOTENCY_KEY }),
    /positive/,
  );
  assert.throws(
    () => prepareExpenseInput({ amount: "10", idempotency_key: "not-a-uuid" }),
    /idempotency/i,
  );
  assert.throws(
    () => prepareExpenseInput({ amount: "10", idempotency_key: IDEMPOTENCY_KEY }),
    /date/i,
  );
});
