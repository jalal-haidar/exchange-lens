"use client";

import { useTheme } from "@/contexts/ThemeContext";
import PermissionGate from "@/components/access/PermissionGate";
import { Permissions } from "@/lib/access/permissions";
import FinancialSetup from "@/components/settings/FinancialSetup";

export default function SettingsPage() {
  const { mode, setMode } = useTheme();

  return (
    <PermissionGate permission={[Permissions.ACCOUNTS_MANAGE, Permissions.OPENING_POSITIONS_MANAGE]}>
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Settings</h1>

      {/* Theme */}
      <div className="bg-surface-raised rounded-xl border border-border-theme p-6 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Appearance</h2>
        <div className="flex gap-3">
          {[
            { value: "light", label: "Light", icon: "☀️" },
            { value: "dark", label: "Dark", icon: "🌙" },
            { value: "system", label: "System", icon: "💻" },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setMode(t.value)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                mode === t.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border-theme text-text-secondary hover:border-border-strong"
              }`}
            >
              <span className="text-lg">{t.icon}</span>
              <span className="font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <FinancialSetup />

      {/* App Info */}
      <div className="bg-surface-raised rounded-xl border border-border-theme p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">About</h2>
        <div className="space-y-2 text-sm text-text-secondary">
          <p>Exchange Lens v0.1.0</p>
          <p>Currency exchange management dashboard</p>
          <p className="text-text-muted">Local currency: PKR (Pakistani Rupee)</p>
        </div>
      </div>
    </div>
    </PermissionGate>
  );
}
