"use client";

import { useState } from "react";

export default function RateManager({ rates, isLoading, onUpdate, onRefresh, readOnly = false }) {
  const [editingRates, setEditingRates] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const handleRateChange = (currencyId, field, value) => {
    const num = Number(value);
    if (value !== "" && (isNaN(num) || num < 0)) return;
    setEditingRates((prev) => ({
      ...prev,
      [currencyId]: {
        ...prev[currencyId],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const ratesToUpdate = Object.entries(editingRates).map(([currencyId, data]) => ({
        currency_id: currencyId,
        buy_rate: Number(data.buy_rate),
        sell_rate: Number(data.sell_rate),
      }));

      await onUpdate.mutateAsync(ratesToUpdate);
      setEditingRates({});
      onRefresh();
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = Object.keys(editingRates).length > 0;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-16 bg-surface-raised rounded-xl border border-border-theme animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {!readOnly && hasChanges && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
          <p className="text-sm text-primary font-medium">You have unsaved changes</p>
          <div className="flex gap-2">
            <button
              onClick={() => setEditingRates({})}
              className="px-3 py-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface-raised rounded-xl border border-border-theme overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-border-theme bg-surface-alt">
              <th className="text-left py-3 px-4 text-text-muted font-medium">Currency</th>
              <th className="text-left py-3 px-4 text-text-muted font-medium">Code</th>
              <th className="text-right py-3 px-4 text-text-muted font-medium">Buy Rate</th>
              <th className="text-right py-3 px-4 text-text-muted font-medium">Sell Rate</th>
              <th className="text-right py-3 px-4 text-text-muted font-medium">Spread</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((rate) => {
              const edited = editingRates[rate.currency_id] || {};
              const buyRate = Number(edited.buy_rate ?? rate.buy_rate);
              const sellRate = Number(edited.sell_rate ?? rate.sell_rate);
              const spread = sellRate - buyRate;

              return (
                <tr key={rate.id} className="border-b border-border-theme/50 hover:bg-hover-bg">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{rate.currency?.symbol}</span>
                      <span className="font-medium text-text-primary">{rate.currency?.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-text-secondary">{rate.currency?.code}</td>
                  <td className="py-3 px-4 text-right">
                    <input
                      type="number"
                      step="0.000001"
                      min="0"
                      readOnly={readOnly}
                      value={edited.buy_rate ?? rate.buy_rate}
                      onChange={readOnly ? undefined : (e) => handleRateChange(rate.currency_id, "buy_rate", e.target.value)}
                      className="w-28 text-right px-2 py-1 bg-surface border border-border-theme rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <input
                      type="number"
                      step="0.000001"
                      min="0"
                      readOnly={readOnly}
                      value={edited.sell_rate ?? rate.sell_rate}
                      onChange={readOnly ? undefined : (e) => handleRateChange(rate.currency_id, "sell_rate", e.target.value)}
                      className="w-28 text-right px-2 py-1 bg-surface border border-border-theme rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </td>
                  <td className={`py-3 px-4 text-right font-medium ${spread >= 0 ? "text-success" : "text-danger"}`}>
                    {spread.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
