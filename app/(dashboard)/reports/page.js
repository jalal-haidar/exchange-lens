"use client";

import { useState } from "react";
import { useReports } from "@/hooks";
import { formatAmount } from "@/lib/utils/format";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("profit-loss");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const { data, isLoading, error, refetch } = useReports(reportType, { date });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
        <p className="text-text-secondary mt-1">View financial reports and analytics</p>
      </div>

      {/* Report Type Selector */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[
          { value: "profit-loss", label: "Profit & Loss" },
          { value: "summary", label: "Daily Summary" },
        ].map((r) => (
          <button
            key={r.value}
            onClick={() => setReportType(r.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === r.value
                ? "bg-primary text-white"
                : "bg-surface-raised border border-border-theme text-text-secondary hover:bg-hover-bg"
            }`}
          >
            {r.label}
          </button>
        ))}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-4 py-2 bg-surface-raised border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && (
        <div className="bg-badge-red-bg border border-danger/20 rounded-xl p-4 mb-6">
          <p className="text-danger font-medium">Failed to load report</p>
          <p className="text-text-secondary text-sm mt-1">{error}</p>
          <button onClick={refetch} className="mt-2 text-sm text-primary hover:text-primary-hover font-medium">Retry</button>
        </div>
      )}

      {isLoading ? (
        <div className="bg-surface-raised rounded-xl border border-border-theme p-12 text-center">
          <div className="animate-pulse text-text-muted">Loading report...</div>
        </div>
      ) : reportType === "profit-loss" && data ? (
        <div className="space-y-6">
          {/* Revenue */}
          <div className="bg-surface-raised rounded-xl border border-border-theme p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Revenue</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-badge-green-bg rounded-lg">
                <p className="text-sm text-text-secondary">Total Sell</p>
                <p className="text-xl font-bold text-success">{formatAmount(data.revenue?.totalSell)}</p>
              </div>
              <div className="p-4 bg-badge-red-bg rounded-lg">
                <p className="text-sm text-text-secondary">Total Buy</p>
                <p className="text-xl font-bold text-danger">{formatAmount(data.revenue?.totalBuy)}</p>
              </div>
              <div className="p-4 bg-badge-green-bg rounded-lg">
                <p className="text-sm text-text-secondary">Gross Profit</p>
                <p className="text-xl font-bold text-success">{formatAmount(data.revenue?.grossProfit)}</p>
              </div>
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-surface-raised rounded-xl border border-border-theme p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Expenses</h2>
            <div className="p-4 bg-badge-red-bg rounded-lg inline-block">
              <p className="text-sm text-text-secondary">Total Expenses</p>
              <p className="text-xl font-bold text-danger">{formatAmount(data.expenses?.totalExpenses)}</p>
            </div>
          </div>

          {/* Net Profit */}
          <div className="bg-surface-raised rounded-xl border border-border-theme p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Net Profit</h2>
            <div className={`p-4 rounded-lg inline-block ${data.netProfit >= 0 ? "bg-badge-green-bg" : "bg-badge-red-bg"}`}>
              <p className="text-sm text-text-secondary">Net Profit</p>
              <p className={`text-2xl font-bold ${data.netProfit >= 0 ? "text-success" : "text-danger"}`}>
                {formatAmount(data.netProfit)}
              </p>
            </div>
          </div>

          {/* Credits */}
          <div className="bg-surface-raised rounded-xl border border-border-theme p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Credits</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-badge-orange-bg rounded-lg">
                <p className="text-sm text-text-secondary">Credit Given</p>
                <p className="text-xl font-bold text-warning">{formatAmount(data.credits?.totalCreditGiven)}</p>
              </div>
              <div className="p-4 bg-badge-green-bg rounded-lg">
                <p className="text-sm text-text-secondary">Payment Received</p>
                <p className="text-xl font-bold text-success">{formatAmount(data.credits?.totalCreditReceived)}</p>
              </div>
              <div className="p-4 bg-badge-blue-bg rounded-lg">
                <p className="text-sm text-text-secondary">Net Credits</p>
                <p className="text-xl font-bold text-info">{formatAmount(data.credits?.netCredits)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : reportType === "summary" && data ? (
        <div className="bg-surface-raised rounded-xl border border-border-theme p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Daily Summary — {data.date}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-badge-green-bg rounded-lg">
              <p className="text-sm text-text-secondary">Total Buy</p>
              <p className="text-xl font-bold text-success">{formatAmount(data.summary?.totalBuy)}</p>
            </div>
            <div className="p-4 bg-badge-blue-bg rounded-lg">
              <p className="text-sm text-text-secondary">Total Sell</p>
              <p className="text-xl font-bold text-info">{formatAmount(data.summary?.totalSell)}</p>
            </div>
            <div className="p-4 bg-badge-red-bg rounded-lg">
              <p className="text-sm text-text-secondary">Expenses</p>
              <p className="text-xl font-bold text-danger">{formatAmount(data.summary?.totalExpenses)}</p>
            </div>
            <div className={`p-4 rounded-lg ${data.summary?.profit >= 0 ? "bg-badge-green-bg" : "bg-badge-red-bg"}`}>
              <p className="text-sm text-text-secondary">Profit</p>
              <p className={`text-xl font-bold ${data.summary?.profit >= 0 ? "text-success" : "text-danger"}`}>
                {formatAmount(data.summary?.profit)}
              </p>
            </div>
          </div>

          {data.transactions?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-text-secondary mb-3">Transactions ({data.transactions.length})</h3>
              <div className="space-y-2">
                {data.transactions.map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center p-3 bg-surface rounded-lg">
                    <span className="text-sm text-text-primary">{tx.customer?.name || tx.description || "—"}</span>
                    <span className="text-sm font-medium text-text-primary">{formatAmount(tx.amount_local)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-surface-raised rounded-xl border border-border-theme p-12 text-center text-text-muted">
          Select a report type and date to view data
        </div>
      )}
    </div>
  );
}
