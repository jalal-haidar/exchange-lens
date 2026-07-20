"use client";

import { TRANSACTION_TYPE_LABELS, TYPE_BADGE_CLASSES } from "@/lib/shared/constants";
import { formatAmount, formatDateShort } from "@/lib/utils/format";

export default function CustomerLedger({ ledger, isLoading }) {
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
      <h2 className="text-lg font-semibold text-text-primary mb-4">Transaction Ledger</h2>

      {ledger.length === 0 ? (
        <p className="text-center text-text-muted py-8">No transactions yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-theme">
                <th className="text-left py-3 px-2 text-text-muted font-medium">Date</th>
                <th className="text-left py-3 px-2 text-text-muted font-medium">Type</th>
                <th className="text-left py-3 px-2 text-text-muted font-medium">Description</th>
                <th className="text-right py-3 px-2 text-text-muted font-medium">Amount</th>
                <th className="text-right py-3 px-2 text-text-muted font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((t) => (
                <tr key={t.id} className="border-b border-border-theme/50 hover:bg-hover-bg">
                  <td className="py-3 px-2 text-text-secondary">{formatDateShort(t.created_at)}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${TYPE_BADGE_CLASSES[t.type]}`}>
                      {TRANSACTION_TYPE_LABELS[t.type]}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-text-primary max-w-[200px] truncate">
                    {t.description || t.reference_number || "—"}
                  </td>
                  <td className="py-3 px-2 text-right font-medium text-text-primary">
                    {formatAmount(t.amount_local)}
                  </td>
                  <td className={`py-3 px-2 text-right font-semibold ${
                    t.running_balance >= 0 ? "text-success" : "text-danger"
                  }`}>
                    {formatAmount(t.running_balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
