"use client";

import { useState } from "react";
import { useRates, useRateMutations } from "@/hooks";
import RateManager from "@/components/rates/RateManager";
import { useExchangeAccess } from "@/contexts/ExchangeAccessContext";
import { Permissions } from "@/lib/access/permissions";

export default function RatesPage() {
  const { can } = useExchangeAccess();
  const canManage = can(Permissions.RATES_MANAGE);
  const { rates, isLoading, error, refetch } = useRates();
  const { updateRates } = useRateMutations();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Exchange Rates</h1>
        <p className="text-text-secondary mt-1">{canManage ? "Manage buy and sell rates for each currency" : "Current buy and sell rates"}</p>
      </div>

      {error && (
        <div className="bg-badge-red-bg border border-danger/20 rounded-xl p-4 mb-6">
          <p className="text-danger font-medium">Failed to load rates</p>
          <p className="text-text-secondary text-sm mt-1">{error}</p>
          <button onClick={refetch} className="mt-2 text-sm text-primary hover:text-primary-hover font-medium">Retry</button>
        </div>
      )}

      <RateManager rates={rates} isLoading={isLoading} onUpdate={updateRates} onRefresh={refetch} readOnly={!canManage} />
    </div>
  );
}
