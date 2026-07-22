"use client";

import { formatAmount } from "@/lib/utils/format";
import { useExchangeAccess } from "@/contexts/ExchangeAccessContext";
import { Permissions } from "@/lib/access/permissions";

const stats = [
  { key: "totalBuy", label: "Total Buy", icon: "\u{1F4E5}", color: "text-stat-blue", bgColor: "bg-badge-blue-bg" },
  { key: "totalSell", label: "Total Sell", icon: "\u{1F4E4}", color: "text-stat-cyan", bgColor: "bg-badge-cyan-bg" },
  { key: "realizedProfit", label: "Realized Profit", icon: "\u{1F4C8}", color: "text-stat-green", bgColor: "bg-badge-green-bg" },
  { key: "totalExpenses", label: "Expenses", icon: "\u{1F4B8}", color: "text-stat-red", bgColor: "bg-badge-red-bg" },
  { key: "totalCustomers", label: "Customers", icon: "\u{1F465}", color: "text-stat-purple", bgColor: "bg-badge-indigo-bg" },
  { key: "pendingCredits", label: "Pending Credits", icon: "\u{1F4B3}", color: "text-stat-orange", bgColor: "bg-badge-orange-bg" },
];

export default function StatsCards({ stats: data, isLoading }) {
  const { can } = useExchangeAccess();
  const visibleStats = stats.filter((stat) => stat.key !== "realizedProfit" || can(Permissions.FINANCIAL_REPORTS_READ));
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {visibleStats.map((stat) => (
          <div key={stat.key} className="bg-surface-raised rounded-xl border border-border-theme p-4 animate-pulse">
            <div className="h-4 bg-skeleton rounded w-20 mb-3"></div>
            <div className="h-6 bg-skeleton rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {visibleStats.map((stat) => (
        <div key={stat.key} className="bg-surface-raised rounded-xl border border-border-theme p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={`flex items-center justify-center w-8 h-8 rounded-lg ${stat.bgColor}`}>
              {stat.icon}
            </span>
            <span className="text-xs font-medium text-text-secondary">{stat.label}</span>
          </div>
          <p className={`text-lg font-bold ${stat.color}`}>
            {stat.key === "totalCustomers" ? (data?.[stat.key] || 0) : formatAmount(data?.[stat.key])}
          </p>
        </div>
      ))}
    </div>
  );
}
