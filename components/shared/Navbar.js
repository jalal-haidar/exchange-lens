"use client";

import { Fragment } from "react";
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from "@headlessui/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useExchangeAccess } from "@/contexts/ExchangeAccessContext";
import { Permissions } from "@/lib/access/permissions";
import Logo from "./Logo";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "🏠", permissions: [Permissions.ACCESS_READ] },
  { name: "Customers", href: "/customers", icon: "👥", permissions: [Permissions.CUSTOMERS_DIRECTORY_READ] },
  { name: "Transactions", href: "/transactions", icon: "💱", permissions: [Permissions.OPERATIONS_READ_ALL, Permissions.TRANSACTIONS_READ_OWN] },
  { name: "Rates", href: "/rates", icon: "📊", permissions: [Permissions.RATES_READ] },
  { name: "Expenses", href: "/expenses", icon: "💸", permissions: [Permissions.OPERATIONS_READ_ALL, Permissions.EXPENSES_READ_OWN] },
  { name: "Reports", href: "/reports", icon: "📈", permissions: [Permissions.FINANCIAL_REPORTS_READ] },
  { name: "Team", href: "/team", icon: "🛡️", permissions: [Permissions.MEMBERS_MANAGE] },
];

function getInitials(email) {
  return email?.charAt(0)?.toUpperCase() || "U";
}

export default function Navbar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { mode, cycleTheme } = useTheme();
  const { organization, permissions } = useExchangeAccess();
  const hubUrl = process.env.NEXT_PUBLIC_HUB_URL || "http://localhost:3000";
  const lensUrl = process.env.NEXT_PUBLIC_EXCHANGE_URL || "http://localhost:3005";

  const handleSignOut = async () => {
    await signOut({ scope: "local" });
    window.location.href = `${hubUrl}/api/auth/signout?redirect=${lensUrl}`;
  };

  return (
    <nav className="hidden sm:flex fixed top-0 left-0 right-0 z-50 bg-surface-nav h-16 items-center px-6">
      <div className="flex items-center gap-8 w-full max-w-7xl mx-auto">
        <Link href="/dashboard" aria-label="Exchange Lens" className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="text-lg font-bold text-text-on-nav">{organization?.name || "Exchange Lens"}</span>
        </Link>

        <div className="flex items-center gap-1 ml-8">
          {navigation.filter((item) => item.permissions.some((permission) => permissions.includes(permission))).map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-text-on-nav/70 hover:text-text-on-nav hover:bg-white/10"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={cycleTheme}
            className="p-2 rounded-lg text-text-on-nav/70 hover:text-text-on-nav hover:bg-white/10 transition-colors"
            title={`Theme: ${mode}`}
          >
            {mode === "dark" ? "🌙" : mode === "light" ? "☀️" : "💻"}
          </button>

          <Menu as="div" className="relative">
            <MenuButton className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/10 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                {getInitials(user?.email)}
              </div>
            </MenuButton>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <MenuItems className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-surface-raised shadow-lg ring-1 ring-border-theme focus:outline-none z-50">
                <div className="px-4 py-3 border-b border-border-theme">
                  <p className="text-sm font-medium text-text-primary">{user?.email}</p>
                  <p className="mt-1 truncate text-xs text-text-muted">{organization?.name}</p>
                </div>
                <div className="py-1">
                  {permissions.includes(Permissions.AUDIT_READ) && <MenuItem><Link href="/audit" className="block px-4 py-2 text-sm text-text-primary hover:bg-hover-bg">Audit log</Link></MenuItem>}
                  {permissions.includes(Permissions.OPENING_POSITIONS_MANAGE) && <MenuItem><Link href="/settings" className="block px-4 py-2 text-sm text-text-primary hover:bg-hover-bg">Settings</Link></MenuItem>}
                  <MenuItem>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-hover-bg transition-colors"
                    >
                      Sign out
                    </button>
                  </MenuItem>
                </div>
              </MenuItems>
            </Transition>
          </Menu>
        </div>
      </div>
    </nav>
  );
}
