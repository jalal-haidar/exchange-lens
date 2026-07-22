"use client";

import Link from "next/link";
import { useExchangeAccess } from "@/contexts/ExchangeAccessContext";

export default function PermissionGate({ permission, children }) {
  const { can, isLoading } = useExchangeAccess();
  const requiredPermissions = Array.isArray(permission) ? permission : [permission];
  const isAllowed = requiredPermissions.some((candidate) => can(candidate));
  if (isLoading) return <div className="p-12 text-center text-text-muted">Checking permission...</div>;
  if (!isAllowed) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-xl font-semibold text-text-primary">Access restricted</h1>
        <p className="mt-2 text-text-secondary">Your Exchange role cannot open this page.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-primary hover:underline">Return to dashboard</Link>
      </div>
    );
  }
  return children;
}
