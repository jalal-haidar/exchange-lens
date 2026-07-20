"use client";

import Link from "next/link";
import { TRANSACTION_TYPE_LABELS } from "@/lib/shared/constants";
import { TYPE_BADGE_CLASSES } from "@/lib/shared/constants";
import { formatAmount, formatDateShort } from "@/lib/utils/format";

export default function RecentTransactions({ transactions, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-surface-raised rounded-xl border border-border-theme p-6">
        <div className="h-5 bg-skeleton rounded w-40 mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-skeleton rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-raised rounded-xl border border-border-theme p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary">Recent Transactions</h2>
        <Link href="/transactions" className="text-sm text-primary hover:text-primary-hover font-medium">
          View all →
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-text-muted">No transactions yet</p>
          <Link href="/transactions/new" className="mt-2 inline-block text-sm text-primary hover:text-primary-hover font-medium">
            Record your first transaction →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-hover-bg transition-colors">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${TYPE_BADGE_CLASSES[tx.type]}`}>
                  {TRANSACTION_TYPE_LABELS[tx.type]}
                </span>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {tx.customer?.name || tx.description || "—"}
                  </p>
                  <p className="text-xs text-text-muted">
                    {tx.currency?.code} • {formatDateShort(tx.created_at)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${
                  tx.type === "sell" || tx.type === "buy" || tx.type === "credit_received"
                    ? "text-success" : "text-danger"
                }`}>
                  {formatAmount(tx.amount_local)}
                </p>
                {tx.amount_foreign > 0 && (
                  <p className="text-xs text-text-muted">
                    {tx.currency?.symbol}{tx.amount_foreign}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
