"use client";

import { useState } from "react";
import Link from "next/link";
import { useCustomerMutations } from "@/hooks";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function CustomerList({ customers, isLoading, onEdit, onRefresh }) {
  const { deleteCustomer } = useCustomerMutations();
  const [deletingCustomer, setDeletingCustomer] = useState(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-surface-raised rounded-xl border border-border-theme animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="bg-surface-raised rounded-xl border border-border-theme p-12 text-center">
        <p className="text-text-muted text-lg">No customers yet</p>
        <p className="text-text-muted text-sm mt-1">Add your first customer to start tracking transactions</p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-3">
      {customers.map((customer) => (
        <div key={customer.id} className="bg-surface-raised rounded-xl border border-border-theme p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <Link href={`/customers/${customer.id}`} className="flex-1">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-text-primary">{customer.name}</p>
                  <p className="text-sm text-text-muted">
                    {customer.phone || customer.email || "No contact info"}
                    {customer.is_active === false && (
                      <span className="ml-2 px-2 py-0.5 bg-badge-red-bg text-badge-red-text rounded text-xs">Inactive</span>
                    )}
                  </p>
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <p className="text-xs text-text-muted">{formatDate(customer.created_at)}</p>
              <button
                onClick={() => onEdit(customer)}
                className="p-2 text-text-muted hover:text-primary hover:bg-hover-bg rounded-lg transition-colors"
              >
                ✏️
              </button>
              <button
                onClick={() => setDeletingCustomer(customer)}
                className="p-2 text-text-muted hover:text-danger hover:bg-badge-red-bg rounded-lg transition-colors"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
    <ConfirmDialog
      open={!!deletingCustomer}
      title="Delete Customer"
      message={`Are you sure you want to delete ${deletingCustomer?.name}? This action cannot be undone.`}
      onConfirm={async () => {
        await deleteCustomer.mutateAsync(deletingCustomer.id);
        setDeletingCustomer(null);
        onRefresh();
      }}
      onCancel={() => setDeletingCustomer(null)}
    />
    </>
  );
}
