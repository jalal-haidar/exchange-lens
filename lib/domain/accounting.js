const MONEY_SCALE = 2;

function parseFixed(value, scale = MONEY_SCALE) {
  const input = String(value ?? "0").trim();
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(input);

  if (!match) {
    throw new TypeError(`Invalid decimal value: ${input}`);
  }

  const [, sign, whole, rawFraction = ""] = match;
  const fraction = rawFraction.padEnd(scale, "0");
  const retained = fraction.slice(0, scale);
  const discarded = fraction.slice(scale);
  let units = BigInt(whole) * (10n ** BigInt(scale)) + BigInt(retained || "0");

  if (discarded.length > 0 && Number(discarded[0]) >= 5) {
    units += 1n;
  }

  return sign === "-" ? -units : units;
}

function formatFixed(units, scale = MONEY_SCALE) {
  const negative = units < 0n;
  const absolute = negative ? -units : units;
  const divisor = 10n ** BigInt(scale);
  const whole = absolute / divisor;
  const fraction = String(absolute % divisor).padStart(scale, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

function sumByType(transactions, type) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + parseFixed(transaction.amount_local), 0n);
}

export function summarizeCashflow({ transactions = [], expenses = [] }) {
  const totalBuy = sumByType(transactions, "buy");
  const totalSell = sumByType(transactions, "sell");
  const totalCreditGiven = sumByType(transactions, "credit_given");
  const totalCreditReceived = sumByType(transactions, "credit_received");
  const totalExpenses = expenses.reduce(
    (total, expense) => total + parseFixed(expense.amount),
    0n,
  );

  return {
    total_buy: formatFixed(totalBuy),
    total_sell: formatFixed(totalSell),
    total_credit_given: formatFixed(totalCreditGiven),
    total_credit_received: formatFixed(totalCreditReceived),
    total_expenses: formatFixed(totalExpenses),
    net_cash_movement: formatFixed(
      totalSell + totalCreditReceived - totalBuy - totalCreditGiven - totalExpenses,
    ),
  };
}

export function calculateCustomerOutstanding(transactions = []) {
  const creditGiven = sumByType(transactions, "credit_given");
  const creditReceived = sumByType(transactions, "credit_received");

  return formatFixed(creditGiven - creditReceived);
}

function divideRound(numerator, denominator) {
  if (denominator <= 0n) {
    throw new RangeError("Cannot divide by zero");
  }

  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return remainder * 2n >= denominator ? quotient + 1n : quotient;
}

function formatRate(totalCost, quantity) {
  if (quantity === 0n) {
    return "0.000000";
  }

  const scaledRate = divideRound(totalCost * 1_000_000n, quantity);
  return formatFixed(scaledRate, 6);
}

export function calculateWeightedAveragePosition({
  opening = { quantity: "0", total_cost_local: "0" },
  trades = [],
} = {}) {
  let quantity = parseFixed(opening.quantity);
  let totalCost = parseFixed(opening.total_cost_local);
  let realizedCost = 0n;
  let realizedMargin = 0n;

  const orderedTrades = [...trades].sort((left, right) => {
    if (!left.posted_at && !right.posted_at) return 0;

    const leftKey = [left.posted_at || left.created_at, left.created_at, left.id]
      .map((value) => value || "")
      .join("|");
    const rightKey = [right.posted_at || right.created_at, right.created_at, right.id]
      .map((value) => value || "")
      .join("|");
    return leftKey.localeCompare(rightKey);
  });

  for (const trade of orderedTrades) {
    if (!["buy", "sell"].includes(trade.type)) {
      continue;
    }

    const tradeQuantity = parseFixed(trade.amount_foreign);
    const localAmount = parseFixed(trade.amount_local);

    if (tradeQuantity <= 0n || localAmount <= 0n) {
      throw new RangeError("Trade amounts must be positive");
    }

    if (trade.type === "buy") {
      quantity += tradeQuantity;
      totalCost += localAmount;
      continue;
    }

    if (tradeQuantity > quantity) {
      throw new RangeError("Insufficient currency inventory");
    }

    const costOfSale = divideRound(totalCost * tradeQuantity, quantity);
    quantity -= tradeQuantity;
    totalCost -= costOfSale;
    realizedCost += costOfSale;
    realizedMargin += localAmount - costOfSale;
  }

  return {
    quantity: formatFixed(quantity),
    total_cost_local: formatFixed(totalCost),
    average_cost_rate: formatRate(totalCost, quantity),
    realized_cost_local: formatFixed(realizedCost),
    realized_margin_local: formatFixed(realizedMargin),
  };
}

export function summarizeProfitLoss({ transactions = [], expenses = [] }) {
  const realizedMargin = transactions
    .filter((transaction) => transaction.type === "sell")
    .reduce(
      (total, transaction) => total + parseFixed(transaction.realized_margin_local),
      0n,
    );
  const totalExpenses = expenses.reduce(
    (total, expense) => total + parseFixed(expense.amount),
    0n,
  );

  return {
    realized_fx_margin: formatFixed(realizedMargin),
    total_expenses: formatFixed(totalExpenses),
    net_profit: formatFixed(realizedMargin - totalExpenses),
  };
}
