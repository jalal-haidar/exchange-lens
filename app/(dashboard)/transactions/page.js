"use client";

import { useState } from "react";
import { useTransactions } from "@/hooks";
import TransactionList from "@/components/transactions/TransactionList";
import Pagination from "@/components/shared/Pagination";

const TYPE_FILTERS = [
  { value: "", label: "All Types" },
  { value: "buy", label: "Buy" },
  { value: "sell", label: "Sell" },
  { value: "credit_given", label: "Credit Given" },
  { value: "credit_received", label: "Payment Received" },
  { value: "expense", label: "Expense" },
];

export default function TransactionsPage() {
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { transactions, pagination, isLoading, error, refetch } = useTransactions({
    type: typeFilter || undefined,
    search: search || undefined,
    page,
  });

  const totalPages = Math.ceil((pagination?.total || 0) / (pagination?.limit || 20));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Transactions</h1>
          <p className="text-text-secondary mt-1">{pagination?.total || 0} total transactions</p>
        </div>
        <a
          href="/transactions/new"
          className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
        >
          + New Transaction
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-surface-raised border border-border-theme rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-surface-raised border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {TYPE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-badge-red-bg border border-danger/20 rounded-xl p-4 mb-6">
          <p className="text-danger font-medium">Failed to load transactions</p>
          <p className="text-text-secondary text-sm mt-1">{error}</p>
          <button onClick={refetch} className="mt-2 text-sm text-primary hover:text-primary-hover font-medium">Retry</button>
        </div>
      )}

      <TransactionList transactions={transactions} isLoading={isLoading} onRefresh={refetch} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
