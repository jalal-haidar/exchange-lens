"use client";

import Link from "next/link";
import { useExchangeAccess } from "@/contexts/ExchangeAccessContext";
import { Permissions } from "@/lib/access/permissions";

const actions = [
  { name: "Buy Currency", href: "/transactions/new?type=buy", icon: "\u{1F4E5}", color: "bg-success", permission: Permissions.TRANSACTIONS_POST },
  { name: "Sell Currency", href: "/transactions/new?type=sell", icon: "\u{1F4E4}", color: "bg-info", permission: Permissions.TRANSACTIONS_POST },
  { name: "Give Credit", href: "/transactions/new?type=credit_given", icon: "\u{1F4B3}", color: "bg-danger", permission: Permissions.TRANSACTIONS_POST },
  { name: "Record Expense", href: "/expenses", icon: "\u{1F4B8}", color: "bg-text-muted", permission: Permissions.EXPENSES_POST },
];

export default function QuickActions() {
  const { can } = useExchangeAccess();
  const visibleActions = actions.filter((action) => can(action.permission));
  if (visibleActions.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {visibleActions.map((action) => (
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
