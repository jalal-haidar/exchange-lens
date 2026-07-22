"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useExchangeAccess } from "@/contexts/ExchangeAccessContext";
import { Permissions } from "@/lib/access/permissions";

const tabs = [
  { name: "Dashboard", href: "/dashboard", icon: "🏠", permissions: [Permissions.ACCESS_READ] },
  { name: "Customers", href: "/customers", icon: "👥", permissions: [Permissions.CUSTOMERS_DIRECTORY_READ] },
  { name: "New", href: "/transactions/new", icon: "➕", isAction: true, permissions: [Permissions.TRANSACTIONS_POST] },
  { name: "Transactions", href: "/transactions", icon: "💱", permissions: [Permissions.OPERATIONS_READ_ALL, Permissions.TRANSACTIONS_READ_OWN] },
  { name: "Rates", href: "/rates", icon: "📊", permissions: [Permissions.RATES_READ] },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { permissions } = useExchangeAccess();
  const visibleTabs = tabs.filter((tab) => tab.permissions.some((permission) => permissions.includes(permission)));

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-nav border-t border-border-theme safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {visibleTabs.map((tab) => {
          const isActive = pathname === tab.href || pathname?.startsWith(tab.href + "/");

          if (tab.isAction) {
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className="relative -mt-5 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-white shadow-lg hover:bg-primary-hover transition-colors"
              >
                <span className="text-2xl">{tab.icon}</span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                isActive ? "text-primary" : "text-text-muted"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[10px] font-medium">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
