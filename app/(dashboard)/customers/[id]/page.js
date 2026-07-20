"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCustomer, useCustomerLedger } from "@/hooks";
import CustomerLedger from "@/components/customers/CustomerLedger";
import { formatAmount, formatDateLong } from "@/lib/utils/format";

export default function CustomerDetailPage() {
  const params = useParams();
  const { customer, isLoading: customerLoading } = useCustomer(params.id);
  const { ledger, balance, isLoading: ledgerLoading } = useCustomerLedger(params.id);

  if (customerLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-skeleton rounded w-48"></div>
          <div className="h-4 bg-skeleton rounded w-64"></div>
          <div className="h-64 bg-skeleton rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <p className="text-text-muted">Customer not found</p>
        <Link href="/customers" className="text-primary hover:text-primary-hover mt-2 inline-block">
          ← Back to customers
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <Link href="/customers" className="text-sm text-primary hover:text-primary-hover mb-4 inline-block">
        ← Back to customers
      </Link>

      {/* Customer Info */}
      <div className="bg-surface-raised rounded-xl border border-border-theme p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{customer.name}</h1>
            {customer.phone && <p className="text-text-secondary mt-1">📞 {customer.phone}</p>}
            {customer.email && <p className="text-text-secondary mt-1">✉️ {customer.email}</p>}
            {customer.address && <p className="text-text-secondary mt-1">📍 {customer.address}</p>}
            {customer.notes && <p className="text-text-secondary mt-1">📝 {customer.notes}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">Balance</p>
            <p className={`text-xl font-bold ${balance >= 0 ? "text-success" : "text-danger"}`}>
              {formatAmount(balance)}
            </p>
            <p className="text-xs text-text-muted mt-1">
              Member since {formatDateLong(customer.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Link
          href={`/transactions/new?customer_id=${customer.id}&type=buy`}
          className="px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Buy from Customer
        </Link>
        <Link
          href={`/transactions/new?customer_id=${customer.id}&type=sell`}
          className="px-4 py-2 bg-info text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Sell to Customer
        </Link>
        <Link
          href={`/transactions/new?customer_id=${customer.id}&type=credit_given`}
          className="px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Give Credit
        </Link>
      </div>

      {/* Ledger */}
      <CustomerLedger ledger={ledger} isLoading={ledgerLoading} />
    </div>
  );
}
