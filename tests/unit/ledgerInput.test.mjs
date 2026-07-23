import assert from "node:assert/strict";
import test from "node:test";

import { requireDecimal, subtractMoney } from "../../lib/domain/ledgerInput.js";

test("ledger decimals reject exponent notation and excess scale", () => {
  assert.throws(() => requireDecimal("1e3", "Amount", { scale: 2 }), /positive/);
  assert.throws(() => requireDecimal("1.001", "Amount", { scale: 2 }), /2 decimal/);
  assert.equal(requireDecimal("0", "Amount", { scale: 2, allowZero: true }), "0");
});

test("money subtraction stays exact beyond Number safe integer range", () => {
  assert.equal(
    subtractMoney("9007199254740993.99", "0.01", "0.02"),
    "9007199254740993.96",
  );
});
