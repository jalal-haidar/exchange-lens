"use client";

import { useState } from "react";
import { useExpenses, useExpenseCategories } from "@/hooks";
import { fetchAPI } from "@/lib/utils/fetchAPI";
import { toast } from "sonner";
import { formatAmount } from "@/lib/utils/format";

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ExpensesPage() {
  const { expenses, isLoading, error, refetch } = useExpenses();
  const { categories } = useExpenseCategories();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ amount: "", description: "", category_id: "" });
  const [formErrors, setFormErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!formData.amount || Number(formData.amount) <= 0) errs.amount = "Amount must be greater than 0";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await fetchAPI("/api/v1/expenses", {
        method: "POST",
        body: JSON.stringify({
          amount: Number(formData.amount),
          description: formData.description,
          category_id: formData.category_id || null,
        }),
      });
      toast.success("Expense recorded");
      setShowForm(false);
      setFormData({ amount: "", description: "", category_id: "" });
      refetch();
    } catch (error) {
      toast.error(error.message || "Failed to record expense");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Expenses</h1>
          <p className="text-text-secondary mt-1">Track business expenses</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
        >
          + Add Expense
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface-raised rounded-xl border border-border-theme p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">New Expense</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Amount (PKR) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0.00"
              />
              {formErrors.amount && <p className="text-xs text-danger mt-1">{formErrors.amount}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
              <input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Expense description"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border-theme text-text-secondary rounded-lg font-medium hover:bg-hover-bg transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors">
              Save Expense
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

      {/* Expense List */}
      <div className="bg-surface-raised rounded-xl border border-border-theme overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-skeleton rounded"></div>
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
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b border-border-theme/50 hover:bg-hover-bg">
                  <td className="py-3 px-4 text-text-secondary">{formatDate(expense.created_at)}</td>
                  <td className="py-3 px-4 text-text-primary">{expense.category?.name || "—"}</td>
                  <td className="py-3 px-4 text-text-primary">{expense.description || "—"}</td>
                  <td className="py-3 px-4 text-right font-semibold text-danger">{formatAmount(expense.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
