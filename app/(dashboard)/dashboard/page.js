"use client";

import { useDashboardStats } from "@/hooks";
import StatsCards from "@/components/dashboard/StatsCards";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import QuickActions from "@/components/dashboard/QuickActions";

export default function DashboardPage() {
  const { stats, recentTransactions, isLoading, error, refetch } = useDashboardStats();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-1">Welcome back. Here&apos;s your exchange overview.</p>
      </div>

      {error && (
        <div className="bg-badge-red-bg border border-danger/20 rounded-xl p-4 mb-6">
          <p className="text-danger font-medium">Failed to load dashboard</p>
          <p className="text-text-secondary text-sm mt-1">{error}</p>
          <button onClick={refetch} className="mt-2 text-sm text-primary hover:text-primary-hover font-medium">Retry</button>
        </div>
      )}

      <QuickActions />

      <div className="mt-8">
        <StatsCards stats={stats} isLoading={isLoading} />
      </div>

      <div className="mt-8">
        <RecentTransactions transactions={recentTransactions} isLoading={isLoading} />
      </div>
    </div>
  );
}
