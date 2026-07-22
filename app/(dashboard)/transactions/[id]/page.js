"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTransaction } from "@/hooks";
import { API_ENDPOINTS } from "@/lib/shared/api";
import { TRANSACTION_TYPE_LABELS, TYPE_BADGE_CLASSES } from "@/lib/shared/constants";
import { fetchAPI } from "@/lib/utils/fetchAPI";
import { formatAmount, formatDateShort } from "@/lib/utils/format";

function getReversal(transaction) {
  if (!transaction?.reversal) return null;
  return Array.isArray(transaction.reversal)
    ? transaction.reversal[0] || null
    : transaction.reversal;
}

export default function TransactionDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { transaction, isLoading, error, refetch } = useTransaction(id);
  const [reason, setReason] = useState("");
  const [isReversing, setIsReversing] = useState(false);
  const reversal = getReversal(transaction);

  const replacementUrl = transaction
    ? `/transactions/new?type=${transaction.type}&customer_id=${transaction.customer_id}&replaces_transaction_id=${transaction.id}`
    : "/transactions/new";

  const reverseTransaction = async (replace) => {
    if (reason.trim().length < 3 || isReversing) return;

    setIsReversing(true);
    try {
      await fetchAPI(API_ENDPOINTS.TRANSACTIONS.REVERSE(id), {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      toast.success("Transaction reversed");
      if (replace) {
        router.push(replacementUrl);
      } else {
        await refetch();
      }
    } catch (reverseError) {
      toast.error(reverseError.message || "Failed to reverse transaction");
    } finally {
      setIsReversing(false);
    }
  };

  if (isLoading) {
    return <div className="max-w-3xl mx-auto px-4 py-12 text-text-muted">Loading transaction...</div>;
  }

  if (error || !transaction) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <p className="text-danger">{error || "Transaction not found"}</p>
        <Link href="/transactions" className="mt-4 inline-block text-primary hover:underline">Back to transactions</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <Link href="/transactions" className="text-sm text-primary hover:underline">Back to transactions</Link>

      <div className="mt-4 bg-surface-raised rounded-xl border border-border-theme p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${TYPE_BADGE_CLASSES[transaction.type]}`}>
              {TRANSACTION_TYPE_LABELS[transaction.type]}
            </span>
            <h1 className="mt-3 text-2xl font-bold text-text-primary">
              {transaction.customer?.name || "Transaction"}
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Posted {formatDateShort(transaction.posted_at || transaction.created_at)}
            </p>
          </div>
          <p className="text-2xl font-bold text-text-primary">{formatAmount(transaction.amount_local)}</p>
        </div>

        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Detail label="Currency" value={transaction.currency?.code || "PKR"} />
          <Detail label="Foreign amount" value={transaction.amount_foreign || "—"} />
          <Detail label="Rate" value={transaction.rate || "—"} />
          <Detail label="Reference" value={transaction.reference_number || "—"} />
          <Detail label="Description" value={transaction.description || "—"} />
          <Detail label="Recorded" value={formatDateShort(transaction.created_at)} />
        </dl>
      </div>

      {reversal ? (
        <div className="mt-6 rounded-xl border border-danger/30 bg-badge-red-bg p-6">
          <h2 className="font-semibold text-danger">Reversed transaction</h2>
          <p className="mt-2 text-sm text-text-secondary">{reversal.reason}</p>
          <p className="mt-1 text-xs text-text-muted">Reversed {formatDateShort(reversal.created_at)}</p>
          <Link
            href={replacementUrl}
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Create corrected replacement
          </Link>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-border-theme bg-surface-raised p-6">
          <h2 className="font-semibold text-text-primary">Correct this transaction</h2>
          <p className="mt-1 text-sm text-text-muted">
            Financial entries cannot be edited or deleted. Reverse this entry and optionally create a corrected replacement.
          </p>
          <label className="mt-4 block text-sm font-medium text-text-secondary" htmlFor="reversal-reason">
            Reversal reason
          </label>
          <textarea
            id="reversal-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-border-theme bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Explain why this entry is being reversed"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => reverseTransaction(false)}
              disabled={reason.trim().length < 3 || isReversing}
              className="rounded-lg border border-danger px-4 py-2 text-sm font-medium text-danger disabled:opacity-50"
            >
              {isReversing ? "Reversing..." : "Reverse only"}
            </button>
            <button
              onClick={() => reverseTransaction(true)}
              disabled={reason.trim().length < 3 || isReversing}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Reverse and replace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-text-muted">{label}</dt>
      <dd className="mt-1 font-medium text-text-primary">{value}</dd>
    </div>
  );
}
