"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExchangeAccess } from "@/contexts/ExchangeAccessContext";

export default function ExchangeAccessGate({ children }) {
  const router = useRouter();
  const { state, isLoading, error, refresh } = useExchangeAccess();

  useEffect(() => {
    if (state === "onboarding") router.replace("/onboarding");
  }, [router, state]);

  if (isLoading || state === "onboarding") {
    return <div className="p-12 text-center text-text-muted">Loading Exchange access...</div>;
  }
  if (state === "selection_required") {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-xl font-semibold text-text-primary">Organization selection required</h1>
        <p className="mt-2 text-text-secondary">This release supports one active Exchange business per account.</p>
      </div>
    );
  }
  if (error || state !== "active") {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-xl font-semibold text-danger">Unable to load Exchange access</h1>
        <button type="button" onClick={() => refresh()} className="mt-4 text-primary hover:underline">Retry</button>
      </div>
    );
  }
  return children;
}
