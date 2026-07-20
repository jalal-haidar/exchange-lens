export const queryKeys = {
  customers: {
    all: ["customers"],
    list: (filters) => ["customers", "list", filters ?? {}],
    detail: (id) => ["customers", "detail", id],
    ledger: (id, filters) => ["customers", "ledger", id, filters ?? {}],
  },
  transactions: {
    all: ["transactions"],
    list: (filters) => ["transactions", "list", filters ?? {}],
    detail: (id) => ["transactions", "detail", id],
  },
  rates: {
    all: ["rates"],
    latest: ["rates", "latest"],
    history: (currencyId) => ["rates", "history", currencyId],
  },
  currencies: {
    all: ["currencies"],
  },
  expenses: {
    all: ["expenses"],
    list: (filters) => ["expenses", "list", filters ?? {}],
    categories: ["expenses", "categories"],
  },
  dashboard: {
    stats: ["dashboard", "stats"],
  },
  reports: {
    summary: (date) => ["reports", "summary", date],
    customer: (customerId, dateRange) => ["reports", "customer", customerId, dateRange],
    profitLoss: (dateRange) => ["reports", "profit-loss", dateRange],
  },
};
