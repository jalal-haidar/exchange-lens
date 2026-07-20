import { TRANSACTION_TYPES } from "@/lib/shared/constants";

export function calculateSpread(buyRate, sellRate) {
  return Number(sellRate) - Number(buyRate);
}

export function calculateProfit(type, amountForeign, buyRate, sellRate) {
  const spread = calculateSpread(buyRate, sellRate);
  if (type === TRANSACTION_TYPES.SELL) {
    return Number(amountForeign) * spread;
  }
  if (type === TRANSACTION_TYPES.BUY) {
    return Number(amountForeign) * spread;
  }
  return 0;
}

export function calculateLocalAmount(type, amountForeign, rate) {
  return Number(amountForeign) * Number(rate);
}

export function calculatePendingCredits(transactions) {
  let totalOwed = 0;
  let totalPaid = 0;

  transactions.forEach((t) => {
    if (t.type === TRANSACTION_TYPES.CREDIT_GIVEN) {
      totalOwed += Number(t.amount_local);
    } else if (t.type === TRANSACTION_TYPES.CREDIT_RECEIVED) {
      totalPaid += Number(t.amount_local);
    }
  });

  return {
    totalOwed,
    totalPaid,
    pending: totalOwed - totalPaid,
  };
}

export function calculateDailySummary(transactions) {
  const summary = {
    totalBuy: 0,
    totalSell: 0,
    totalExpenses: 0,
    totalCreditGiven: 0,
    totalCreditReceived: 0,
    profit: 0,
  };

  transactions.forEach((t) => {
    switch (t.type) {
      case TRANSACTION_TYPES.BUY:
        summary.totalBuy += Number(t.amount_local);
        break;
      case TRANSACTION_TYPES.SELL:
        summary.totalSell += Number(t.amount_local);
        break;
      case TRANSACTION_TYPES.EXPENSE:
        summary.totalExpenses += Number(t.amount_local);
        break;
      case TRANSACTION_TYPES.CREDIT_GIVEN:
        summary.totalCreditGiven += Number(t.amount_local);
        break;
      case TRANSACTION_TYPES.CREDIT_RECEIVED:
        summary.totalCreditReceived += Number(t.amount_local);
        break;
    }
  });

  summary.profit = summary.totalSell - summary.totalBuy - summary.totalExpenses;
  return summary;
}

export function formatCurrency(amount, currency = "PKR") {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num) {
  return new Intl.NumberFormat("en-PK").format(num);
}
