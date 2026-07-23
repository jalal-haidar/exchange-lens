"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useExchangeAccess } from "@/contexts/ExchangeAccessContext";
import { Permissions } from "@/lib/access/permissions";

export default function ExchangeAccessGate({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { state, isLoading, error, refresh, organization, permissions } = useExchangeAccess();
  const setupRequired = organization?.financialSetupStatus === "required";
  const canManageAccounts = permissions.includes(Permissions.ACCOUNTS_MANAGE);

  useEffect(() => {
    if (state === "onboarding") router.replace("/onboarding");
    if (state === "active" && setupRequired && canManageAccounts && pathname !== "/settings") {
      router.replace("/settings");
    }
  }, [canManageAccounts, pathname, router, setupRequired, state]);

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
  if (setupRequired && pathname !== "/settings") {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-xl font-semibold text-text-primary">Financial setup required</h1>
        <p className="mt-2 text-text-secondary">
          {canManageAccounts
            ? "Redirecting you to configure cash and bank accounts."
            : "The business owner must configure opening balances before financial posting can begin."}
        </p>
      </div>
    );
  }
  return children;
}
