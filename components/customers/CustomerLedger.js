"use client";

import { TYPE_BADGE_CLASSES } from "@/lib/shared/constants";
import { formatAmount, formatDateShort } from "@/lib/utils/format";

const ACTIVITY_LABELS = {
  buy: "Buy",
  sell: "Sell",
  receipt: "Receipt",
  payout: "Payout",
  opening: "Opening balance",
  reversal: "Reversal",
  adjustment: "Adjustment",
};

const FALLBACK_BADGE = "bg-badge-blue-bg text-info";

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
      <h2 className="text-lg font-semibold text-text-primary mb-4">Customer Ledger</h2>

      {ledger.length === 0 ? (
        <p className="text-center text-text-muted py-8">No customer activity yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-theme">
                <th className="text-left py-3 px-2 text-text-muted font-medium">Date</th>
                <th className="text-left py-3 px-2 text-text-muted font-medium">Type</th>
                <th className="text-left py-3 px-2 text-text-muted font-medium">Description</th>
                <th className="text-right py-3 px-2 text-text-muted font-medium">Activity</th>
                <th className="text-right py-3 px-2 text-text-muted font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry) => (
                <tr key={entry.id} className="border-b border-border-theme/50 hover:bg-hover-bg">
                  <td className="py-3 px-2 text-text-secondary">
                    {formatDateShort(entry.posted_at || entry.created_at)}
                  </td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      TYPE_BADGE_CLASSES[entry.type] || FALLBACK_BADGE
                    }`}>
                      {ACTIVITY_LABELS[entry.type] || entry.type || "Activity"}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-text-primary max-w-[200px] truncate">
                    {entry.description || entry.reference_number || "—"}
                  </td>
                  <td className="py-3 px-2 text-right font-medium text-text-primary">
                    {formatAmount(entry.amount_local)}
                  </td>
                  <td className={`py-3 px-2 text-right font-semibold ${
                    Number(entry.running_balance) > 0 ? "text-danger" : "text-success"
                  }`}>
                    {formatAmount(entry.running_balance)}
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
