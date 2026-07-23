"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useCustomers, useFinancialAccounts } from "@/hooks";
import { API_ENDPOINTS } from "@/lib/shared/api";
import { fetchAPI } from "@/lib/utils/fetchAPI";

function localDateTime() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export default function FinancialSetup() {
  const { accounts, currencies, isLoading, error, refetch } = useFinancialAccounts();
  const { customers } = useCustomers({ limit: 100 });
  const [accountForm, setAccountForm] = useState({
    name: "",
    code: "",
    currency_id: "",
    account_kind: "cash",
    allow_negative: false,
  });
  const [opening, setOpening] = useState({});
  const [busy, setBusy] = useState(false);
  const [customerOpening, setCustomerOpening] = useState({
    customer_id: "",
    receivable: "0",
    payable: "0",
    effective_at: localDateTime(),
  });
  const openingKeys = useRef(new Map());

  const createAccount = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await fetchAPI(API_ENDPOINTS.ACCOUNTS.CREATE, {
        method: "POST",
        body: JSON.stringify(accountForm),
      });
      setAccountForm({
        name: "",
        code: "",
        currency_id: "",
        account_kind: "cash",
        allow_negative: false,
      });
      await refetch();
      toast.success("Financial account created");
    } catch (requestError) {
      toast.error(requestError.message || "Failed to create account");
    } finally {
      setBusy(false);
    }
  };

  const setOpeningBalance = async (account) => {
    const values = opening[account.id] || {};
    const key = openingKeys.current.get(account.id) || crypto.randomUUID();
    openingKeys.current.set(account.id, key);
    setBusy(true);
    try {
      await fetchAPI(API_ENDPOINTS.ACCOUNTS.OPENING_BALANCE, {
        method: "POST",
        body: JSON.stringify({
          account_id: account.id,
          balance: values.balance || "0",
          cost_local: account.currency_code === "PKR"
            ? values.balance || "0"
            : values.cost_local || "0",
          effective_at: new Date(values.effective_at || localDateTime()).toISOString(),
          idempotency_key: key,
        }),
      });
      openingKeys.current.delete(account.id);
      await refetch();
      toast.success(`Opening balance saved for ${account.name}`);
    } catch (requestError) {
      toast.error(requestError.message || "Failed to save opening balance");
    } finally {
      setBusy(false);
    }
  };

  const completeSetup = async () => {
    setBusy(true);
    try {
      await fetchAPI(API_ENDPOINTS.ACCOUNTS.COMPLETE_SETUP, { method: "POST" });
      toast.success("Financial setup completed. Ledger posting is now active.");
      window.location.reload();
    } catch (requestError) {
      toast.error(requestError.message || "Financial setup is incomplete");
    } finally {
      setBusy(false);
    }
  };

  const setCustomerBalance = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await fetchAPI(API_ENDPOINTS.ACCOUNTS.CUSTOMER_OPENING, {
        method: "POST",
        body: JSON.stringify({
          ...customerOpening,
          idempotency_key: crypto.randomUUID(),
          effective_at: new Date(customerOpening.effective_at).toISOString(),
        }),
      });
      setCustomerOpening({
        customer_id: "",
        receivable: "0",
        payable: "0",
        effective_at: localDateTime(),
      });
      toast.success("Customer opening balance saved");
    } catch (requestError) {
      toast.error(requestError.message || "Failed to save customer balance");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-border-theme bg-surface-raised p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text-primary">Cash and bank accounts</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Create every place where PKR or foreign currency is actually held, then record its opening balance.
        </p>
      </div>

      {error && (
        <button type="button" onClick={refetch} className="mb-4 text-sm text-danger underline">
          Accounts failed to load. Retry
        </button>
      )}

      <form onSubmit={createAccount} className="grid gap-3 sm:grid-cols-2">
        <input
          required
          value={accountForm.name}
          onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })}
          placeholder="Account name, e.g. Main cash drawer"
          className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary"
        />
        <input
          required
          pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,39}"
          value={accountForm.code}
          onChange={(event) => setAccountForm({ ...accountForm, code: event.target.value.toUpperCase() })}
          placeholder="Code, e.g. MAIN_CASH"
          className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary"
        />
        <select
          required
          value={accountForm.currency_id}
          onChange={(event) => setAccountForm({ ...accountForm, currency_id: event.target.value })}
          className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary"
        >
          <option value="">{isLoading ? "Loading currencies..." : "Currency"}</option>
          {currencies.map((currency) => (
            <option key={currency.id} value={currency.id}>{currency.code} — {currency.name}</option>
          ))}
        </select>
        <select
          value={accountForm.account_kind}
          onChange={(event) => setAccountForm({
            ...accountForm,
            account_kind: event.target.value,
            allow_negative: event.target.value === "bank" && accountForm.allow_negative,
          })}
          className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary"
        >
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
        </select>
        {accountForm.account_kind === "bank" && (
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={accountForm.allow_negative}
              onChange={(event) => setAccountForm({
                ...accountForm,
                allow_negative: event.target.checked,
              })}
            />
            Allow owner-approved overdraft
          </label>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          Add account
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {accounts.map((account) => {
          const values = opening[account.id] || { effective_at: localDateTime() };
          return (
            <div key={account.id} className="rounded-lg border border-border-theme p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-text-primary">{account.name}</p>
                  <p className="text-xs text-text-muted">
                    {account.currency_code} {account.account_kind} · current balance {account.balance}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <input
                  type="number"
                  step="any"
                  value={values.balance || ""}
                  onChange={(event) => setOpening({
                    ...opening,
                    [account.id]: { ...values, balance: event.target.value },
                  })}
                  placeholder="Opening balance"
                  className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary"
                />
                {account.currency_code !== "PKR" && (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={values.cost_local || ""}
                    onChange={(event) => setOpening({
                      ...opening,
                      [account.id]: { ...values, cost_local: event.target.value },
                    })}
                    placeholder="PKR carrying cost"
                    className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary"
                  />
                )}
                <input
                  type="datetime-local"
                  value={values.effective_at}
                  onChange={(event) => setOpening({
                    ...opening,
                    [account.id]: { ...values, effective_at: event.target.value },
                  })}
                  className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setOpeningBalance(account)}
                  className="rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary disabled:opacity-50"
                >
                  Save opening
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={setCustomerBalance} className="mt-6 border-t border-border-theme pt-5">
        <h3 className="font-medium text-text-primary">Customer opening balance</h3>
        <p className="mt-1 text-xs text-text-muted">
          Use receivable when the customer owes the exchange; use payable when the exchange owes the customer.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <select required value={customerOpening.customer_id} onChange={(event) => setCustomerOpening({ ...customerOpening, customer_id: event.target.value })} className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary">
            <option value="">Customer</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
          </select>
          <input type="number" min="0" step="0.01" value={customerOpening.receivable} onChange={(event) => setCustomerOpening({ ...customerOpening, receivable: event.target.value })} placeholder="Receivable PKR" className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary" />
          <input type="number" min="0" step="0.01" value={customerOpening.payable} onChange={(event) => setCustomerOpening({ ...customerOpening, payable: event.target.value })} placeholder="Payable PKR" className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary" />
          <button disabled={busy} className="rounded-lg border border-primary px-3 py-2 font-medium text-primary disabled:opacity-50">Save customer opening</button>
        </div>
      </form>

      <button
        type="button"
        onClick={completeSetup}
        disabled={busy || !accounts.some((account) => account.currency_code === "PKR")}
        className="mt-6 rounded-lg bg-success px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        Complete financial setup
      </button>
      <p className="mt-2 text-xs text-text-muted">
        After completion, every trade and expense must select a real account and will post a balanced journal entry.
      </p>
    </section>
  );
}
