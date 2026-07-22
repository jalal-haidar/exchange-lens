import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateCustomerOutstanding,
  calculateWeightedAveragePosition,
  summarizeCashflow,
  summarizeProfitLoss,
} from "../../lib/domain/accounting.js";

test("cashflow includes canonical expenses and credit movements", () => {
  const transactions = [
    { type: "buy", amount_local: "100000.00" },
    { type: "sell", amount_local: "115000.00" },
    { type: "credit_given", amount_local: "10000.00" },
    { type: "credit_received", amount_local: "4000.00" },
  ];
  const expenses = [
    { amount: "3000.00" },
    { amount: "2000.00" },
  ];

  assert.deepEqual(summarizeCashflow({ transactions, expenses }), {
    total_buy: "100000.00",
    total_sell: "115000.00",
    total_credit_given: "10000.00",
    total_credit_received: "4000.00",
    total_expenses: "5000.00",
    net_cash_movement: "4000.00",
  });
});

test("customer outstanding balance only uses explicit credit movements", () => {
  const transactions = [
    { type: "buy", amount_local: "25000.00" },
    { type: "sell", amount_local: "30000.00" },
    { type: "credit_given", amount_local: "10000.00" },
    { type: "credit_received", amount_local: "3500.00" },
  ];

  assert.equal(calculateCustomerOutstanding(transactions), "6500.00");
});

test("weighted-average inventory produces a stable realized margin", () => {
  const result = calculateWeightedAveragePosition({
    opening: {
      quantity: "100.00",
      total_cost_local: "27000.00",
    },
    trades: [
      {
        type: "buy",
        amount_foreign: "50.00",
        amount_local: "14500.00",
      },
      {
        type: "sell",
        amount_foreign: "60.00",
        amount_local: "18000.00",
      },
    ],
  });

  assert.deepEqual(result, {
    quantity: "90.00",
    total_cost_local: "24900.00",
    average_cost_rate: "276.666667",
    realized_cost_local: "16600.00",
    realized_margin_local: "1400.00",
  });
});
test("weighted-average inventory follows posted time for backdated trades", () => {
  const position = calculateWeightedAveragePosition({
    trades: [
      {
        id: "sell-created-first",
        type: "sell",
        amount_foreign: "5.00",
        amount_local: "600.00",
        posted_at: "2026-07-02T09:00:00.000Z",
        created_at: "2026-07-01T10:00:00.000Z",
      },
      {
        id: "buy-backdated",
        type: "buy",
        amount_foreign: "10.00",
        amount_local: "1000.00",
        posted_at: "2026-07-01T09:00:00.000Z",
        created_at: "2026-07-02T10:00:00.000Z",
      },
    ],
  });

  assert.equal(position.quantity, "5.00");
  assert.equal(position.realized_margin_local, "100.00");
});


test("profit uses realized FX margin and canonical expenses", () => {
  const transactions = [
    { type: "buy", realized_margin_local: "0.00" },
    { type: "sell", realized_margin_local: "1400.00" },
    { type: "sell", realized_margin_local: "-100.00" },
  ];
  const expenses = [{ amount: "500.00" }];

  assert.deepEqual(summarizeProfitLoss({ transactions, expenses }), {
    realized_fx_margin: "1300.00",
    total_expenses: "500.00",
    net_profit: "800.00",
  });
});
