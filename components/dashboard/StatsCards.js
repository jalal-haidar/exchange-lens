"use client";

import { formatAmount } from "@/lib/utils/format";

const stats = [
  { key: "totalBuy", label: "Total Buy", icon: "📥", color: "text-stat-blue", bgColor: "bg-badge-blue-bg" },
  { key: "totalSell", label: "Total Sell", icon: "📤", color: "text-stat-cyan", bgColor: "bg-badge-cyan-bg" },
  { key: "profit", label: "Profit", icon: "📈", color: "text-stat-green", bgColor: "bg-badge-green-bg" },
  { key: "totalExpenses", label: "Expenses", icon: "💸", color: "text-stat-red", bgColor: "bg-badge-red-bg" },
  { key: "totalCustomers", label: "Customers", icon: "👥", color: "text-stat-purple", bgColor: "bg-badge-indigo-bg" },
  { key: "pendingCredits", label: "Pending Credits", icon: "💳", color: "text-stat-orange", bgColor: "bg-badge-orange-bg" },
];

export default function StatsCards({ stats: data, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <div key={s.key} className="bg-surface-raised rounded-xl border border-border-theme p-4 animate-pulse">
            <div className="h-4 bg-skeleton rounded w-20 mb-3"></div>
            <div className="h-6 bg-skeleton rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((s) => (
        <div key={s.key} className="bg-surface-raised rounded-xl border border-border-theme p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={`flex items-center justify-center w-8 h-8 rounded-lg ${s.bgColor}`}>
              {s.icon}
            </span>
            <span className="text-xs font-medium text-text-secondary">{s.label}</span>
          </div>
          <p className={`text-lg font-bold ${s.color}`}>
            {s.key === "totalCustomers" ? (data?.[s.key] || 0) : formatAmount(data?.[s.key])}
          </p>
        </div>
      ))}
    </div>
  );
}
