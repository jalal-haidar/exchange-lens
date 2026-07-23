"use client";

import { useRef, useState } from "react";
import { useExpenses, useExpenseCategories, useFinancialAccounts } from "@/hooks";
import { fetchAPI } from "@/lib/utils/fetchAPI";
import { toast } from "sonner";
import { formatAmount } from "@/lib/utils/format";
import { useExchangeAccess } from "@/contexts/ExchangeAccessContext";
import { Permissions } from "@/lib/access/permissions";
import PermissionGate from "@/components/access/PermissionGate";

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getLocalDateTime() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function createEmptyForm() {
  return {
    amount: "",
    description: "",
    category_id: "",
    account_id: "",
    date: getLocalDateTime(),
  };
}

function ExpensesPageContent() {
  const { can } = useExchangeAccess();
  const canPost = can(Permissions.EXPENSES_POST);
  const canReverse = can(Permissions.EXPENSES_REVERSE);
  const { expenses, isLoading, error, refetch } = useExpenses();
  const { accounts, isLoading: accountsLoading, error: accountsError } = useFinancialAccounts();
  const {
    categories,
    isLoading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useExpenseCategories();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(createEmptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [reversalReason, setReversalReason] = useState("");
  const [isReversing, setIsReversing] = useState(false);
  const idempotencyKey = useRef(null);

  const validate = () => {
    const errors = {};
    if (!formData.amount || Number(formData.amount) <= 0) {
      errors.amount = "Amount must be greater than 0";
    }
    if (!formData.date || Number.isNaN(Date.parse(formData.date))) {
      errors.date = "Date and time are required";
    }
    if (!formData.account_id) {
      errors.account_id = "Payment account is required";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const closeForm = () => {
    setShowForm(false);
    setFormData(createEmptyForm());
    setFormErrors({});
    idempotencyKey.current = null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting || !validate()) return;

    idempotencyKey.current ||= crypto.randomUUID();
    setIsSubmitting(true);
    try {
      await fetchAPI("/api/v1/expenses", {
        method: "POST",
        body: JSON.stringify({
          amount: formData.amount,
          description: formData.description,
          category_id: formData.category_id || null,
          account_id: formData.account_id,
          date: new Date(formData.date).toISOString(),
          idempotency_key: idempotencyKey.current,
        }),
      });
      toast.success("Expense recorded");
      closeForm();
      await refetch();
    } catch (submitError) {
      toast.error(submitError.message || "Failed to record expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReverse = async (event) => {
    event.preventDefault();
    if (!selectedExpense || reversalReason.trim().length < 3 || isReversing) return;

    setIsReversing(true);
    try {
      await fetchAPI(`/api/v1/expenses/${selectedExpense.id}/reverse`, {
        method: "POST",
        body: JSON.stringify({ reason: reversalReason.trim() }),
      });
      toast.success("Expense reversed");
      setSelectedExpense(null);
      setReversalReason("");
      await refetch();
    } catch (reverseError) {
      toast.error(reverseError.message || "Failed to reverse expense");
    } finally {
      setIsReversing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Expenses</h1>
          <p className="text-text-secondary mt-1">Track business expenses</p>
        </div>
        {canPost && <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
        >
          + Add Expense
        </button>}
      </div>

      {canPost && showForm && (
        <form onSubmit={handleSubmit} className="bg-surface-raised rounded-xl border border-border-theme p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">New Expense</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Paid from *</label>
              <select
                value={formData.account_id}
                onChange={(event) => setFormData({ ...formData, account_id: event.target.value })}
                disabled={accountsLoading || Boolean(accountsError)}
                className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                <option value="">{accountsLoading ? "Loading accounts..." : "Select PKR account"}</option>
                {accounts.filter((account) => account.currency_code === "PKR").map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} — {account.balance}
                  </option>
                ))}
              </select>
              {(formErrors.account_id || accountsError) && (
                <p className="text-xs text-danger mt-1">{formErrors.account_id || accountsError}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Amount (PKR) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(event) => setFormData({ ...formData, amount: event.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0.00"
              />
              {formErrors.amount && <p className="text-xs text-danger mt-1">{formErrors.amount}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Date and time *</label>
              <input
                type="datetime-local"
                value={formData.date}
                onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {formErrors.date && <p className="text-xs text-danger mt-1">{formErrors.date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Category</label>
              <select
                value={formData.category_id}
                onChange={(event) => setFormData({ ...formData, category_id: event.target.value })}
                disabled={categoriesLoading || Boolean(categoriesError)}
                className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                <option value="">{categoriesLoading ? "Loading categories..." : "Select category"}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              {categoriesError && (
                <button type="button" onClick={refetchCategories} className="text-xs text-danger mt-1 hover:underline">
                  Categories failed to load. Retry
                </button>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
              <input
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Expense description"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={closeForm} disabled={isSubmitting} className="px-4 py-2 border border-border-theme text-text-secondary rounded-lg font-medium hover:bg-hover-bg transition-colors disabled:opacity-60">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-60">
              {isSubmitting ? "Saving..." : "Save Expense"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="bg-badge-red-bg border border-danger/20 rounded-xl p-4 mb-6">
          <p className="text-danger font-medium">Failed to load expenses</p>
          <p className="text-text-secondary text-sm mt-1">{error}</p>
          <button onClick={refetch} className="mt-2 text-sm text-primary hover:text-primary-hover font-medium">Retry</button>
        </div>
      )}

      {canReverse && selectedExpense && (
        <form onSubmit={handleReverse} className="mb-6 rounded-xl border border-danger/30 bg-badge-red-bg p-6">
          <h2 className="font-semibold text-danger">Reverse expense</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {formatAmount(selectedExpense.amount)} — {selectedExpense.description || "No description"}
          </p>
          <label htmlFor="expense-reversal-reason" className="mt-4 block text-sm font-medium text-text-secondary">
            Reversal reason
          </label>
          <textarea
            id="expense-reversal-reason"
            value={reversalReason}
            onChange={(event) => setReversalReason(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Explain why this expense is being reversed"
          />
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              disabled={isReversing}
              onClick={() => { setSelectedExpense(null); setReversalReason(""); }}
              className="rounded-lg border border-border-theme px-4 py-2 text-sm text-text-secondary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={reversalReason.trim().length < 3 || isReversing}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isReversing ? "Reversing..." : "Reverse expense"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-surface-raised rounded-xl border border-border-theme overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-12 bg-skeleton rounded" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-text-muted">No expenses recorded yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-theme bg-surface-alt">
                <th className="text-left py-3 px-4 text-text-muted font-medium">Date</th>
                <th className="text-left py-3 px-4 text-text-muted font-medium">Category</th>
                <th className="text-left py-3 px-4 text-text-muted font-medium">Description</th>
                <th className="text-right py-3 px-4 text-text-muted font-medium">Amount</th>
                {canReverse && <th className="text-right py-3 px-4 text-text-muted font-medium">Action</th>}
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b border-border-theme/50 hover:bg-hover-bg">
                  <td className="py-3 px-4 text-text-secondary">{formatDate(expense.date || expense.created_at)}</td>
                  <td className="py-3 px-4 text-text-primary">{expense.category?.name || "\u2014"}</td>
                  <td className="py-3 px-4 text-text-primary">{expense.description || "\u2014"}</td>
                  <td className="py-3 px-4 text-right font-semibold text-danger">{formatAmount(expense.amount)}</td>
                  {canReverse && <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => { setSelectedExpense(expense); setReversalReason(""); }}
                      className="text-xs font-medium text-danger hover:underline"
                    >
                      Reverse
                    </button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <PermissionGate permission={[Permissions.OPERATIONS_READ_ALL, Permissions.EXPENSES_READ_OWN]}>
      <ExpensesPageContent />
    </PermissionGate>
  );
}
