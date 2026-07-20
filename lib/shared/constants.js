export const PAGINATION_DEFAULTS = {
  LIMIT: 20,
  MAX_LIMIT: 50,
  MIN_LIMIT: 1,
};

export const SORT_DIRECTIONS = {
  ASC: "asc",
  DESC: "desc",
};

export const TRANSACTION_TYPES = {
  BUY: "buy",
  SELL: "sell",
  CREDIT_GIVEN: "credit_given",
  CREDIT_RECEIVED: "credit_received",
  EXPENSE: "expense",
};

export const TRANSACTION_TYPE_LABELS = {
  buy: "Buy",
  sell: "Sell",
  credit_given: "Credit Given",
  credit_received: "Payment Received",
  expense: "Expense",
};

export const TRANSACTION_TYPE_COLORS = {
  buy: "emerald",
  sell: "blue",
  credit_given: "red",
  credit_received: "orange",
  expense: "gray",
};

export const TYPE_BADGE_CLASSES = {
  buy: "bg-badge-green-bg text-badge-green-text",
  sell: "bg-badge-blue-bg text-badge-blue-text",
  credit_given: "bg-badge-red-bg text-badge-red-text",
  credit_received: "bg-badge-orange-bg text-badge-orange-text",
  expense: "bg-badge-gray-bg text-badge-gray-text",
};

export const AMOUNT_COLOR_CLASSES = {
  positive: "text-success",
  negative: "text-danger",
};

export const API_VERSION = "v1";

export const LOCAL_CURRENCY = "PKR";
