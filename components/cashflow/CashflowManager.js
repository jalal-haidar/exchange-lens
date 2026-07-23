"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useCustomers, useFinancialAccounts, useTransactions } from "@/hooks";
import { useExchangeAccess } from "@/contexts/ExchangeAccessContext";
import { Permissions } from "@/lib/access/permissions";
import { API_ENDPOINTS } from "@/lib/shared/api";
import { fetchAPI } from "@/lib/utils/fetchAPI";
import { subtractMoney } from "@/lib/domain/ledgerInput";

function localDateTime() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function localDate() {
  return localDateTime().slice(0, 10);
}

export default function CashflowManager() {
  const { can, organization } = useExchangeAccess();
  const { accounts, isLoading, error, refetch } = useFinancialAccounts();
  const { customers } = useCustomers({ limit: 100 });
  const [customerId, setCustomerId] = useState("");
  const { transactions } = useTransactions(
    { customer_id: customerId, limit: 50 },
    { enabled: Boolean(customerId) },
  );
  const [busy, setBusy] = useState(false);
  const [integrity, setIntegrity] = useState(null);
  const [settlement, setSettlement] = useState({
    direction: "receipt",
    account_id: "",
    amount_local: "",
    transaction_id: "",
    allocation_amount: "",
    description: "",
    posted_at: localDateTime(),
  });
  const [transfer, setTransfer] = useState({
    source_account_id: "",
    destination_account_id: "",
    amount_currency: "",
    description: "",
    posted_at: localDateTime(),
  });
  const [counts, setCounts] = useState({});
  const settlementKey = useRef(crypto.randomUUID());
  const transferKey = useRef(crypto.randomUUID());
  const closeKey = useRef(crypto.randomUUID());

  const pkrAccounts = accounts.filter((account) => account.currency_code === "PKR");
  const eligibleTrades = useMemo(
    () => transactions.filter((transaction) => (
      settlement.direction === "receipt"
        ? transaction.type === "sell"
        : transaction.type === "buy"
    ) && transaction.settlement_status !== "settled"),
    [settlement.direction, transactions],
  );
  const source = accounts.find((account) => account.id === transfer.source_account_id);
  const transferDestinations = accounts.filter(
    (account) => account.currency_id === source?.currency_id && account.id !== source?.id,
  );

  const postSettlement = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const allocations = settlement.transaction_id
        ? [{
          transaction_id: settlement.transaction_id,
          amount: settlement.allocation_amount,
        }]
        : [];
      await fetchAPI(API_ENDPOINTS.SETTLEMENTS.CREATE, {
        method: "POST",
        body: JSON.stringify({
          idempotency_key: settlementKey.current,
          customer_id: customerId,
          account_id: settlement.account_id,
          direction: settlement.direction,
          amount_local: settlement.amount_local,
          allocations,
          description: settlement.description,
          posted_at: new Date(settlement.posted_at).toISOString(),
        }),
      });
      settlementKey.current = crypto.randomUUID();
      setSettlement({
        ...settlement,
        amount_local: "",
        transaction_id: "",
        allocation_amount: "",
        description: "",
      });
      await refetch();
      toast.success("Customer settlement posted");
    } catch (requestError) {
      toast.error(requestError.message || "Settlement failed");
    } finally {
      setBusy(false);
    }
  };

  const postTransfer = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await fetchAPI(API_ENDPOINTS.TRANSFERS.CREATE, {
        method: "POST",
        body: JSON.stringify({
          ...transfer,
          idempotency_key: transferKey.current,
          posted_at: new Date(transfer.posted_at).toISOString(),
        }),
      });
      transferKey.current = crypto.randomUUID();
      setTransfer({
        source_account_id: "",
        destination_account_id: "",
        amount_currency: "",
        description: "",
        posted_at: localDateTime(),
      });
      await refetch();
      toast.success("Account transfer posted");
    } catch (requestError) {
      toast.error(requestError.message || "Transfer failed");
    } finally {
      setBusy(false);
    }
  };

  const runIntegrityCheck = async () => {
    setBusy(true);
    try {
      const result = await fetchAPI(API_ENDPOINTS.LEDGER.INTEGRITY);
      setIntegrity(result.data?.integrity);
    } catch (requestError) {
      toast.error(requestError.message || "Integrity check failed");
    } finally {
      setBusy(false);
    }
  };

  const closeDay = async () => {
    setBusy(true);
    try {
      await fetchAPI(API_ENDPOINTS.RECONCILIATIONS.CLOSE, {
        method: "POST",
        body: JSON.stringify({
          business_date: localDate(),
          counts: accounts.map((account) => ({
            account_id: account.id,
            counted_balance: counts[account.id] ?? account.balance,
          })),
          notes: "End-of-day account count",
          idempotency_key: closeKey.current,
        }),
      });
      closeKey.current = crypto.randomUUID();
      toast.success("Business day closed and locked");
      window.location.reload();
    } catch (requestError) {
      toast.error(requestError.message || "Day close failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Cashflow</h1>
        <p className="mt-1 text-text-secondary">
          Real account balances, customer settlements, transfers, and day close.
        </p>
      </div>

      {error && <button type="button" onClick={refetch} className="text-danger underline">Balances failed to load. Retry</button>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? <p className="text-text-muted">Loading balances...</p> : accounts.map((account) => (
          <div key={account.id} className="rounded-xl border border-border-theme bg-surface-raised p-4">
            <p className="text-sm text-text-muted">{account.currency_code} · {account.account_kind}</p>
            <p className="mt-1 font-medium text-text-primary">{account.name}</p>
            <p className="mt-2 text-xl font-bold text-text-primary">{account.balance}</p>
          </div>
        ))}
      </div>

      {can(Permissions.SETTLEMENTS_POST) && (
        <form onSubmit={postSettlement} className="mt-6 rounded-xl border border-border-theme bg-surface-raised p-6">
          <h2 className="text-lg font-semibold text-text-primary">Customer receipt or payout</h2>
          <p className="mt-1 text-sm text-text-muted">
            Allocate against a trade, or leave unallocated as a customer advance/loan.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select required value={settlement.direction} onChange={(event) => setSettlement({ ...settlement, direction: event.target.value, transaction_id: "" })} className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary">
              <option value="receipt">Receive PKR</option>
              <option value="payout">Pay out PKR</option>
            </select>
            <select required value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary">
              <option value="">Customer</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </select>
            <select required value={settlement.account_id} onChange={(event) => setSettlement({ ...settlement, account_id: event.target.value })} className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary">
              <option value="">PKR account</option>
              {pkrAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} — {account.balance}</option>)}
            </select>
            <input required type="number" min="0.01" step="0.01" value={settlement.amount_local} onChange={(event) => setSettlement({ ...settlement, amount_local: event.target.value })} placeholder="Amount PKR" className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary" />
            <select value={settlement.transaction_id} onChange={(event) => setSettlement({ ...settlement, transaction_id: event.target.value })} className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary">
              <option value="">Unallocated advance/loan</option>
              {eligibleTrades.map((transaction) => (
                <option key={transaction.id} value={transaction.id}>
                  {transaction.reference_number || transaction.id.slice(0, 8)} — outstanding {subtractMoney(transaction.amount_local, transaction.settled_amount_local)}
                </option>
              ))}
            </select>
            {settlement.transaction_id && <input required type="number" min="0.01" step="0.01" value={settlement.allocation_amount} onChange={(event) => setSettlement({ ...settlement, allocation_amount: event.target.value })} placeholder="Allocated amount" className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary" />}
            <input type="datetime-local" required value={settlement.posted_at} onChange={(event) => setSettlement({ ...settlement, posted_at: event.target.value })} className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary" />
            <input value={settlement.description} onChange={(event) => setSettlement({ ...settlement, description: event.target.value })} placeholder="Reference or note" className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary" />
          </div>
          <button disabled={busy} className="mt-4 rounded-lg bg-primary px-4 py-2 font-medium text-white disabled:opacity-50">Post settlement</button>
        </form>
      )}

      {can(Permissions.TRANSFERS_POST) && (
        <form onSubmit={postTransfer} className="mt-6 rounded-xl border border-border-theme bg-surface-raised p-6">
          <h2 className="text-lg font-semibold text-text-primary">Transfer between accounts</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select required value={transfer.source_account_id} onChange={(event) => setTransfer({ ...transfer, source_account_id: event.target.value, destination_account_id: "" })} className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary">
              <option value="">Source account</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} ({account.currency_code})</option>)}
            </select>
            <select required value={transfer.destination_account_id} onChange={(event) => setTransfer({ ...transfer, destination_account_id: event.target.value })} className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary">
              <option value="">Destination account</option>
              {transferDestinations.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
            <input required type="number" min="0.00000001" step="any" value={transfer.amount_currency} onChange={(event) => setTransfer({ ...transfer, amount_currency: event.target.value })} placeholder="Amount" className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary" />
            <input type="datetime-local" required value={transfer.posted_at} onChange={(event) => setTransfer({ ...transfer, posted_at: event.target.value })} className="rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary" />
          </div>
          <button disabled={busy || transferDestinations.length === 0} className="mt-4 rounded-lg bg-primary px-4 py-2 font-medium text-white disabled:opacity-50">Post transfer</button>
        </form>
      )}

      {can(Permissions.INTEGRITY_READ) && (
        <section className="mt-6 rounded-xl border border-border-theme bg-surface-raised p-6">
          <h2 className="text-lg font-semibold text-text-primary">Owner controls</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={busy} onClick={runIntegrityCheck} className="rounded-lg border border-primary px-4 py-2 font-medium text-primary disabled:opacity-50">Run integrity check</button>
            {integrity && <span className={integrity.ok ? "text-success" : "text-danger"}>{integrity.ok ? "Ledger checks passed" : "Ledger needs attention"}</span>}
          </div>
          {can(Permissions.RECONCILIATIONS_CLOSE) && (
            <div className="mt-6 border-t border-border-theme pt-4">
              <p className="text-sm text-text-secondary">
                Count each account for {localDate()} ({organization?.businessTimezone}). Any variance must be corrected before close.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {accounts.map((account) => (
                  <label key={account.id} className="text-xs text-text-muted">
                    {account.name}
                    <input type="number" step="any" value={counts[account.id] ?? account.balance} onChange={(event) => setCounts({ ...counts, [account.id]: event.target.value })} className="mt-1 w-full rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary" />
                  </label>
                ))}
              </div>
              <button type="button" disabled={busy || accounts.length === 0} onClick={closeDay} className="mt-4 rounded-lg bg-danger px-4 py-2 font-medium text-white disabled:opacity-50">Close and lock business day</button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
