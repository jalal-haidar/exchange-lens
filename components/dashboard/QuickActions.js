"use client";

import Link from "next/link";

const actions = [
  { name: "Buy Currency", href: "/transactions/new?type=buy", icon: "📥", color: "bg-success" },
  { name: "Sell Currency", href: "/transactions/new?type=sell", icon: "📤", color: "bg-info" },
  { name: "Give Credit", href: "/transactions/new?type=credit_given", icon: "💳", color: "bg-danger" },
  { name: "Record Expense", href: "/transactions/new?type=expense", icon: "💸", color: "bg-text-muted" },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((action) => (
        <Link
          key={action.name}
          href={action.href}
          className="flex items-center gap-3 p-4 bg-surface-raised rounded-xl border border-border-theme hover:shadow-md transition-all group"
        >
          <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${action.color} text-white text-lg group-hover:scale-110 transition-transform`}>
            {action.icon}
          </div>
          <span className="text-sm font-medium text-text-primary">{action.name}</span>
        </Link>
      ))}
    </div>
  );
}
