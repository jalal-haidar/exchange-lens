"use client";

import Link from "next/link";
import { TRANSACTION_TYPE_LABELS, TYPE_BADGE_CLASSES } from "@/lib/shared/constants";
import { formatAmount, formatDateShort } from "@/lib/utils/format";

export default function TransactionList({ transactions, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(8)].map((_, index) => (
          <div key={index} className="h-16 bg-surface-raised rounded-xl border border-border-theme animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-surface-raised rounded-xl border border-border-theme p-12 text-center">
        <p className="text-text-muted text-lg">No transactions found</p>
        <p className="text-text-muted text-sm mt-1">Record your first buy or sell to get started</p>
        <Link
          href="/transactions/new"
          className="inline-block mt-4 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors text-sm"
        >
          + New Transaction
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((transaction) => (
        <Link
          key={transaction.id}
          href={`/transactions/${transaction.id}`}
          className="block bg-surface-raised rounded-xl border border-border-theme p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${TYPE_BADGE_CLASSES[transaction.type]}`}>
                {TRANSACTION_TYPE_LABELS[transaction.type]}
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {transaction.customer?.name || transaction.description || "\u2014"}
                </p>
                <p className="text-xs text-text-muted">
                  {transaction.currency?.code} {transaction.currency?.symbol} {"\u2022"} {formatDateShort(transaction.posted_at || transaction.created_at)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${
                transaction.type === "sell" || transaction.type === "buy" || transaction.type === "credit_received"
                  ? "text-success" : "text-danger"
              }`}>
                {formatAmount(transaction.amount_local)}
              </p>
              {transaction.amount_foreign > 0 && (
                <p className="text-xs text-text-muted">
                  {transaction.currency?.symbol}{transaction.amount_foreign}
                </p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
