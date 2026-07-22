"use client";

import { useQuery } from "@tanstack/react-query";
import PermissionGate from "@/components/access/PermissionGate";
import { Permissions } from "@/lib/access/permissions";
import { fetchAPI } from "@/lib/utils/fetchAPI";

function label(value) { return String(value || "").replaceAll("_", " "); }

export default function AuditPage() {
  const query = useQuery({ queryKey: ["exchange-audit"], queryFn: () => fetchAPI("/api/v1/audit?limit=50") });
  return (
    <PermissionGate permission={Permissions.AUDIT_READ}>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:pt-24">
        <h1 className="text-2xl font-bold text-text-primary">Audit log</h1>
        <p className="mb-6 mt-1 text-text-secondary">An owner-only record of sensitive ledger and access changes.</p>
        {query.isLoading ? <p className="text-text-muted">Loading audit events...</p> : query.isError ? <button onClick={() => query.refetch()} className="text-danger underline">Could not load audit log. Retry</button> : (
          <div className="overflow-hidden rounded-xl border border-border-theme bg-surface-raised">
            {query.data.events.length === 0 ? <p className="p-6 text-text-muted">No audit events yet.</p> : query.data.events.map((event) => (
              <div key={event.id} className="grid gap-1 border-b border-border-theme p-4 last:border-0 sm:grid-cols-[190px_1fr_auto] sm:items-center">
                <time className="text-sm text-text-muted">{new Date(event.created_at).toLocaleString()}</time>
                <div><p className="font-medium capitalize text-text-primary">{label(event.action)}</p><p className="text-sm text-text-muted">{label(event.entity_type)} · actor {event.actor_user_id?.slice(0, 8) || "system"}</p></div>
                {event.metadata && Object.keys(event.metadata).length > 0 && <code className="max-w-xs truncate text-xs text-text-muted">{JSON.stringify(event.metadata)}</code>}
              </div>
            ))}
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
