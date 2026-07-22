import assert from "node:assert/strict";
import test from "node:test";

import { prepareOpeningPositionInput } from "../../lib/domain/positionInput.js";

const CURRENCY_ID = "11111111-1111-4111-8111-111111111111";

test("opening position preserves exact quantity and cost", () => {
  assert.deepEqual(
    prepareOpeningPositionInput({
      currency_id: CURRENCY_ID,
      quantity: "1250.50",
      total_cost_local: "348765.25",
      effective_at: "2026-07-21T09:00:00.000Z",
    }),
    {
      p_currency_id: CURRENCY_ID,
      p_quantity: "1250.50",
      p_total_cost_local: "348765.25",
      p_effective_at: "2026-07-21T09:00:00.000Z",
    },
  );
});

test("opening position can explicitly start at zero", () => {
  const result = prepareOpeningPositionInput({
    currency_id: CURRENCY_ID,
    quantity: "0",
    total_cost_local: "0.00",
    effective_at: "2026-07-21T09:00:00.000Z",
  });

  assert.equal(result.p_quantity, "0");
  assert.equal(result.p_total_cost_local, "0.00");
});

test("opening quantity and cost must both be zero or both positive", () => {
  assert.throws(
    () => prepareOpeningPositionInput({
      currency_id: CURRENCY_ID,
      quantity: "10",
      total_cost_local: "0",
      effective_at: "2026-07-21T09:00:00.000Z",
    }),
    /both be zero or both be positive/i,
  );
});
