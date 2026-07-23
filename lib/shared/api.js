import { API_VERSION } from "./constants";

export function createApiEndpoints(baseUrl) {
  return {
    CUSTOMERS: {
      LIST: `${baseUrl}/customers`,
      CREATE: `${baseUrl}/customers`,
      GET: (id) => `${baseUrl}/customers/${id}`,
      UPDATE: (id) => `${baseUrl}/customers/${id}`,
      DELETE: (id) => `${baseUrl}/customers/${id}`,
      LEDGER: (id) => `${baseUrl}/customers/${id}/ledger`,
    },
    TRANSACTIONS: {
      LIST: `${baseUrl}/transactions`,
      CREATE: `${baseUrl}/transactions`,
      GET: (id) => `${baseUrl}/transactions/${id}`,
      REVERSE: (id) => `${baseUrl}/transactions/${id}/reverse`,
    },
    RATES: {
      LIST: `${baseUrl}/rates`,
      UPDATE: `${baseUrl}/rates`,
      LATEST: `${baseUrl}/rates/latest`,
      HISTORY: `${baseUrl}/rates/history`,
    },
    EXPENSES: {
      LIST: `${baseUrl}/expenses`,
      CREATE: `${baseUrl}/expenses`,
      GET: (id) => `${baseUrl}/expenses/${id}`,
      UPDATE: (id) => `${baseUrl}/expenses/${id}`,
      DELETE: (id) => `${baseUrl}/expenses/${id}`,
      REVERSE: (id) => `${baseUrl}/expenses/${id}/reverse`,
      CATEGORIES: `${baseUrl}/expenses/categories`,
    },
    DASHBOARD: {
      STATS: `${baseUrl}/dashboard/stats`,
    },
    REPORTS: {
      SUMMARY: `${baseUrl}/reports/summary`,
      CUSTOMER: `${baseUrl}/reports/customer`,
      PROFIT_LOSS: `${baseUrl}/reports/profit-loss`,
    },
    POSITIONS: {
      LIST: `${baseUrl}/positions`,
      SET_OPENING: `${baseUrl}/positions`,
    },
    ACCOUNTS: {
      LIST: `${baseUrl}/accounts`,
      CREATE: `${baseUrl}/accounts`,
      OPENING_BALANCE: `${baseUrl}/accounts/opening-balance`,
      CUSTOMER_OPENING: `${baseUrl}/accounts/customer-opening`,
      COMPLETE_SETUP: `${baseUrl}/accounts/complete-setup`,
    },
    SETTLEMENTS: {
      CREATE: `${baseUrl}/settlements`,
    },
    TRANSFERS: {
      CREATE: `${baseUrl}/transfers`,
    },
    RECONCILIATIONS: {
      CLOSE: `${baseUrl}/reconciliations/close`,
    },
    LEDGER: {
      INTEGRITY: `${baseUrl}/ledger/integrity`,
    },
  };
}

const API_BASE = `/api/${API_VERSION}`;
export const API_ENDPOINTS = createApiEndpoints(API_BASE);

export function buildQueryString(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  });
  const str = searchParams.toString();
  return str ? `?${str}` : "";
}
