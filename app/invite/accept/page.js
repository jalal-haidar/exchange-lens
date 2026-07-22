"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import Logo from "@/components/shared/Logo";
import { useExchangeAccess } from "@/contexts/ExchangeAccessContext";
import { fetchAPI } from "@/lib/utils/fetchAPI";

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, refresh } = useExchangeAccess();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const token = searchParams.get("token") || "";

  async function acceptInvitation() {
    setIsSubmitting(true);
    try {
      await fetchAPI("/api/v1/invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      await refresh();
      toast.success("Invitation accepted");
      router.replace("/dashboard");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface-alt px-4 py-12">
      <div className="mx-auto max-w-lg rounded-2xl border border-border-theme bg-surface-raised p-8 text-center shadow-sm">
        <Logo className="mx-auto h-12 w-12" />
        <h1 className="mt-5 text-2xl font-bold text-text-primary">Join an Exchange business</h1>
        {state === "active" ? (
          <>
            <p className="mt-3 text-text-secondary">This account already belongs to an Exchange business.</p>
            <Link href="/dashboard" className="mt-6 inline-block rounded-xl bg-primary px-5 py-3 font-semibold text-white">Open dashboard</Link>
          </>
        ) : !token ? (
          <p className="mt-3 text-danger">The invitation link is missing its one-time token.</p>
        ) : (
          <>
            <p className="mt-3 text-text-secondary">
              Accept with the same verified LifeLens email address that received the invitation.
            </p>
            <button
              type="button"
              onClick={acceptInvitation}
              disabled={isSubmitting}
              className="mt-6 rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {isSubmitting ? "Accepting..." : "Accept invitation"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-surface-alt p-12 text-center text-text-muted">Loading invitation...</main>}>
      <AcceptInvitationContent />
    </Suspense>
  );
}
