"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchAPI } from "@/lib/utils/fetchAPI";
import { formatAmount } from "@/lib/utils/format";

function getLocalDateTime() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function OpeningPositions() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ quantity: "", total_cost_local: "", effective_at: getLocalDateTime() });
  const [isSaving, setIsSaving] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["currency-positions"],
    queryFn: async ({ signal }) => {
      const result = await fetchAPI("/api/v1/positions", { signal });
      return result.data?.positions || [];
    },
    staleTime: 30_000,
  });

  const startEditing = (position) => {
    setEditing(position);
    setForm({
      quantity: position.opening_quantity || "0.00",
      total_cost_local: position.opening_cost_local || "0.00",
      effective_at: position.opening_effective_at
        ? new Date(
          new Date(position.opening_effective_at).getTime()
            - new Date(position.opening_effective_at).getTimezoneOffset() * 60_000,
        ).toISOString().slice(0, 16)
        : getLocalDateTime(),
    });
  };

  const savePosition = async (event) => {
    event.preventDefault();
    if (!editing || isSaving) return;

    setIsSaving(true);
    try {
      await fetchAPI("/api/v1/positions", {
        method: "POST",
        body: JSON.stringify({
          currency_id: editing.currency.id,
          quantity: form.quantity,
          total_cost_local: form.total_cost_local,
          effective_at: new Date(form.effective_at).toISOString(),
        }),
      });
      toast.success(`${editing.currency.code} opening position saved`);
      setEditing(null);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
    } catch (saveError) {
      toast.error(saveError.message || "Failed to save opening position");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="bg-surface-raised rounded-xl border border-border-theme p-6 mb-6">
      <h2 className="text-lg font-semibold text-text-primary">Opening Currency Inventory</h2>
      <p className="mt-1 text-sm text-text-muted">
        Enter stock already on hand before recording trades. Opening values lock after the first active trade for that currency.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-danger/20 bg-badge-red-bg p-4 text-sm">
          <p className="text-danger">{error.message || "Failed to load currency positions"}</p>
          <button type="button" onClick={refetch} className="mt-2 font-medium text-primary hover:underline">Retry</button>
        </div>
      )}

      {isLoading ? (
        <p className="mt-4 text-sm text-text-muted">Loading positions...</p>
      ) : (
        <div className="mt-4 space-y-3">
          {(data || []).map((position) => (
            <div key={position.currency.id} className="flex flex-col gap-3 rounded-lg border border-border-theme p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-text-primary">{position.currency.code} — {position.currency.name}</p>
                <p className="mt-1 text-sm text-text-secondary">
                  Current: {position.quantity} {position.currency.code} · Cost basis: {formatAmount(position.total_cost_local)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => startEditing(position)}
                className="rounded-lg border border-border-theme px-3 py-2 text-sm font-medium text-primary hover:bg-hover-bg"
              >
                Set opening stock
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <form onSubmit={savePosition} className="mt-5 rounded-lg border border-primary/30 bg-surface p-4">
          <h3 className="font-medium text-text-primary">{editing.currency.code} opening position</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="text-sm text-text-secondary">
              Quantity
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.quantity}
                onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                className="mt-1 w-full rounded-lg border border-border-theme bg-surface-raised px-3 py-2 text-text-primary"
              />
            </label>
            <label className="text-sm text-text-secondary">
              Total cost (PKR)
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.total_cost_local}
                onChange={(event) => setForm({ ...form, total_cost_local: event.target.value })}
                className="mt-1 w-full rounded-lg border border-border-theme bg-surface-raised px-3 py-2 text-text-primary"
              />
            </label>
            <label className="text-sm text-text-secondary">
              Effective date and time
              <input
                type="datetime-local"
                required
                value={form.effective_at}
                onChange={(event) => setForm({ ...form, effective_at: event.target.value })}
                className="mt-1 w-full rounded-lg border border-border-theme bg-surface-raised px-3 py-2 text-text-primary"
              />
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => setEditing(null)} disabled={isSaving} className="rounded-lg border border-border-theme px-4 py-2 text-sm text-text-secondary disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSaving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {isSaving ? "Saving..." : "Save opening stock"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
