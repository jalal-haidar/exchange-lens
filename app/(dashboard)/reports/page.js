"use client";

import { useState } from "react";
import { useReports } from "@/hooks";
import { formatAmount } from "@/lib/utils/format";
import PermissionGate from "@/components/access/PermissionGate";
import { Permissions } from "@/lib/access/permissions";

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState("profit-loss");
  const [date, setDate] = useState(getLocalDate);
  const [timezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const params = reportType === "profit-loss"
    ? { start_date: date, end_date: date, timezone }
    : { date, timezone };
  const { data, isLoading, error, refetch } = useReports(reportType, params);

  return (
    <PermissionGate permission={Permissions.FINANCIAL_REPORTS_READ}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
        <p className="text-text-secondary mt-1">View financial reports and analytics</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        {[
          { value: "profit-loss", label: "Profit & Loss" },
          { value: "summary", label: "Daily Summary" },
        ].map((report) => (
          <button
            key={report.value}
            onClick={() => setReportType(report.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === report.value
                ? "bg-primary text-white"
                : "bg-surface-raised border border-border-theme text-text-secondary hover:bg-hover-bg"
            }`}
          >
            {report.label}
          </button>
        ))}
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
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
          <section className="bg-surface-raised rounded-xl border border-border-theme p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-1">Cash Movement</h2>
            <p className="text-sm text-text-muted mb-4">Money paid and received during this period</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Metric label="Currency bought" value={data.cashflow?.totalBuy} tone="danger" />
              <Metric label="Currency sold" value={data.cashflow?.totalSell} tone="success" />
              <Metric label="Expenses paid" value={data.cashflow?.totalExpenses} tone="danger" />
              <Metric label="Net cash movement" value={data.cashflow?.netCashMovement} signed />
            </div>
          </section>

          <section className="bg-surface-raised rounded-xl border border-border-theme p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-1">Realized Performance</h2>
            <p className="text-sm text-text-muted mb-4">Weighted-average margin earned on completed sales</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Metric label="Realized FX margin" value={data.profit?.realizedFxMargin} signed />
              <Metric label="Business expenses" value={data.profit?.totalExpenses} tone="danger" />
              <Metric label="Net realized profit" value={data.profit?.netProfit} signed emphasized />
            </div>
          </section>

          <section className="bg-surface-raised rounded-xl border border-border-theme p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Customer Credit Movement</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Metric label="Credit given" value={data.cashflow?.totalCreditGiven} tone="danger" />
              <Metric label="Payments received" value={data.cashflow?.totalCreditReceived} tone="success" />
            </div>
          </section>
        </div>
      ) : reportType === "summary" && data ? (
        <div className="bg-surface-raised rounded-xl border border-border-theme p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-1">Daily Summary — {data.date}</h2>
          <p className="text-sm text-text-muted mb-4">Business day interpreted in {data.timezone}</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Metric label="Total buy" value={data.summary?.totalBuy} tone="danger" />
            <Metric label="Total sell" value={data.summary?.totalSell} tone="success" />
            <Metric label="Expenses" value={data.summary?.totalExpenses} tone="danger" />
            <Metric label="Net cash movement" value={data.summary?.netCashMovement} signed />
            <Metric label="Realized FX margin" value={data.summary?.realizedFxMargin} signed />
            <Metric label="Net realized profit" value={data.summary?.realizedProfit} signed emphasized />
          </div>

          {data.transactions?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-text-secondary mb-3">Transactions ({data.transactions.length})</h3>
              <div className="space-y-2">
                {data.transactions.map((transaction) => (
                  <div key={transaction.id} className="flex justify-between items-center p-3 bg-surface rounded-lg">
                    <span className="text-sm text-text-primary">{transaction.customer?.name || transaction.description || "—"}</span>
                    <span className="text-sm font-medium text-text-primary">{formatAmount(transaction.amount_local)}</span>
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
    </PermissionGate>
  );
}

function Metric({ label, value, tone, signed = false, emphasized = false }) {
  const isPositive = Number(value || 0) >= 0;
  const color = tone === "danger"
    ? "text-danger"
    : tone === "success" || (signed && isPositive)
      ? "text-success"
      : "text-danger";
  const background = color === "text-success" ? "bg-badge-green-bg" : "bg-badge-red-bg";

  return (
    <div className={`p-4 rounded-lg ${background}`}>
      <p className="text-sm text-text-secondary">{label}</p>
      <p className={`${emphasized ? "text-2xl" : "text-xl"} font-bold ${color}`}>
        {formatAmount(value)}
      </p>
    </div>
  );
}
