"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Logo from "@/components/shared/Logo";
import { useExchangeAccess } from "@/contexts/ExchangeAccessContext";
import { fetchAPI } from "@/lib/utils/fetchAPI";

export default function OnboardingPage() {
  const router = useRouter();
  const { state, refresh } = useExchangeAccess();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (state === "active") router.replace("/dashboard");
  }, [router, state]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await fetchAPI("/api/v1/organizations", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      await refresh();
      toast.success("Your Exchange business is ready");
      router.replace("/dashboard");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-12">
      <div className="mx-auto max-w-lg rounded-2xl border border-border-theme bg-surface-raised p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <Logo className="h-10 w-10" />
          <div>
            <p className="text-sm text-text-muted">Exchange Lens</p>
            <h1 className="text-2xl font-bold text-text-primary">Create your business</h1>
          </div>
        </div>
        <p className="mb-6 text-text-secondary">
          This creates a private workspace for your exchange ledger. You will be its owner and can invite staff after setup.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-text-primary">Business name</span>
            <input
              autoFocus
              required
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Example Currency Exchange"
              className="w-full rounded-xl border border-border-theme bg-surface px-4 py-3 text-text-primary outline-none focus:border-primary"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting || name.trim().length < 2}
            className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Creating business..." : "Create business"}
          </button>
        </form>
      </div>
    </main>
  );
}
