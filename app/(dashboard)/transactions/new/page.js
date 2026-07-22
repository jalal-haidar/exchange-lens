"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { useCustomers, useRates, useTransactionMutations } from "@/hooks";

const TRANSACTION_TYPES = [
  { value: "buy", label: "Buy Currency", description: "Customer sells foreign currency to you" },
  { value: "sell", label: "Sell Currency", description: "Customer buys foreign currency from you" },
  { value: "credit_given", label: "Give Credit", description: "Give PKR credit/loan to customer" },
  { value: "credit_received", label: "Receive Payment", description: "Customer pays back credit" },
];

const TYPE_ACTIVE_CLASSES = {
  buy: "border-success bg-badge-green-bg",
  sell: "border-info bg-badge-blue-bg",
  credit_given: "border-danger bg-badge-red-bg",
  credit_received: "border-warning bg-badge-orange-bg",
};

function getLocalDateTimeValue(date = new Date()) {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

function NewTransactionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedType = searchParams.get("type");
  const initialType = TRANSACTION_TYPES.some(({ value }) => value === requestedType)
    ? requestedType
    : "buy";
  const initialCustomerId = searchParams.get("customer_id") || "";
  const replacesTransactionId = searchParams.get("replaces_transaction_id") || null;

  const [transactionType, setTransactionType] = useState(initialType);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const { customers } = useCustomers({ limit: 100 });
  const { rates } = useRates();
  const { createTransaction } = useTransactionMutations();

  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      customer_id: initialCustomerId,
      currency_id: "",
      amount_foreign: "",
      amount_local: "",
      rate: "",
      description: "",
      reference_number: "",
      posted_at: getLocalDateTimeValue(),
    },
  });

  const watchCurrencyId = useWatch({ control, name: "currency_id" });
  const watchAmountForeign = useWatch({ control, name: "amount_foreign" });
  const watchRate = useWatch({ control, name: "rate" });

  // Auto-fill rate when currency is selected
  useEffect(() => {
    if (watchCurrencyId) {
      const rate = rates.find((r) => r.currency_id === watchCurrencyId);
      if (rate) {
        const autoRate = transactionType === "buy" ? rate.buy_rate : rate.sell_rate;
        setValue("rate", autoRate);
      }
    }
  }, [watchCurrencyId, rates, transactionType, setValue]);

  // Auto-calculate local amount
  useEffect(() => {
    if (watchAmountForeign && watchRate) {
      const local = Number(watchAmountForeign) * Number(watchRate);
      setValue("amount_local", local.toFixed(2));
    }
  }, [watchAmountForeign, watchRate, setValue]);

  const showCurrency = ["buy", "sell"].includes(transactionType);
  const showRate = ["buy", "sell"].includes(transactionType);
  const showCustomer = true;

  const onSubmit = async (data) => {
    try {
      const payload = {
        idempotency_key: idempotencyKey,
        type: transactionType,
        customer_id: data.customer_id || null,
        currency_id: data.currency_id || null,
        amount_foreign: data.amount_foreign || null,
        amount_local: data.amount_local || null,
        rate: data.rate || null,
        description: data.description || null,
        reference_number: data.reference_number || null,
        posted_at: new Date(data.posted_at).toISOString(),
        replaces_transaction_id: replacesTransactionId,
      };

      await createTransaction.mutateAsync(payload);
      setIdempotencyKey(crypto.randomUUID());
      router.push("/transactions");
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl font-bold text-text-primary mb-6">New Transaction</h1>
      {replacesTransactionId && (
        <div className="mb-6 rounded-lg border border-warning/30 bg-badge-orange-bg p-4 text-sm text-text-secondary">
          This transaction will replace a reversed entry. Re-enter the corrected values carefully.
        </div>
      )}

      {/* Type Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
        {TRANSACTION_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setTransactionType(t.value)}
            className={`p-3 rounded-xl border-2 text-center transition-all ${
              transactionType === t.value
                ? TYPE_ACTIVE_CLASSES[t.value]
                : "border-border-theme bg-surface-raised hover:border-border-strong"
            }`}
          >
            <p className="text-sm font-medium text-text-primary">{t.label}</p>
          </button>
        ))}
      </div>

      <p className="text-sm text-text-secondary mb-6">
        {TRANSACTION_TYPES.find((t) => t.value === transactionType)?.description}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-surface-raised rounded-xl border border-border-theme p-6">
        {/* Customer */}
        {showCustomer && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Customer *</label>
            <select
              {...register("customer_id", { required: showCustomer ? "Customer is required" : false })}
              className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.customer_id && <p className="text-xs text-danger mt-1">{errors.customer_id.message}</p>}
          </div>
        )}

        {/* Currency */}
        {showCurrency && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Currency *</label>
            <select
              {...register("currency_id", { required: showCurrency ? "Currency is required" : false })}
              className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select currency</option>
              {rates.map((r) => (
                <option key={r.currency_id} value={r.currency_id}>
                  {r.currency?.name} ({r.currency?.code})
                </option>
              ))}
            </select>
            {errors.currency_id && <p className="text-xs text-danger mt-1">{errors.currency_id.message}</p>}
          </div>
        )}

        {/* Foreign Amount */}
        {showCurrency && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Foreign Amount</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              {...register("amount_foreign", {
                required: showCurrency ? "Foreign amount is required" : false,
                min: { value: 0.01, message: "Foreign amount must be positive" },
              })}
              className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="0.00"
            />
            {errors.amount_foreign && <p className="text-xs text-danger mt-1">{errors.amount_foreign.message}</p>}
          </div>
        )}

        {/* Rate */}
        {showRate && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Rate (auto-filled)</label>
            <input
              type="number"
              step="0.000001"
              min="0.000001"
              {...register("rate", {
                required: showRate ? "Rate is required" : false,
                min: { value: 0.000001, message: "Rate must be positive" },
              })}
              className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Auto-filled from current rates"
            />
            {errors.rate && <p className="text-xs text-danger mt-1">{errors.rate.message}</p>}
          </div>
        )}

        {/* Local Amount */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Amount (PKR) *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            readOnly={showCurrency}
            {...register("amount_local", { required: "Amount is required", min: { value: 0.01, message: "Amount must be positive" } })}
            className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="0.00"
          />
          {errors.amount_local && <p className="text-xs text-danger mt-1">{errors.amount_local.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Transaction time *</label>
          <input
            type="datetime-local"
            {...register("posted_at", {
              required: "Transaction time is required",
              validate: (value) => !Number.isNaN(new Date(value).getTime()) || "Transaction time is invalid",
            })}
            className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.posted_at && <p className="text-xs text-danger mt-1">{errors.posted_at.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
          <input
            {...register("description")}
            className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Transaction description"
          />
        </div>

        {/* Reference */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Reference Number</label>
          <input
            {...register("reference_number")}
            className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Receipt or reference number"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-2 border border-border-theme text-text-secondary rounded-lg font-medium hover:bg-hover-bg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Recording..." : "Record Transaction"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewTransactionPage() {
  return (
    <Suspense>
      <NewTransactionForm />
    </Suspense>
  );
}
