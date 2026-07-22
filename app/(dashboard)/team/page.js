"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PermissionGate from "@/components/access/PermissionGate";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Permissions, ASSIGNABLE_ROLES } from "@/lib/access/permissions";
import { fetchAPI } from "@/lib/utils/fetchAPI";

const roleDescription = {
  manager: "All day-to-day ledger operations, without owner financial reports or team control.",
  operator: "Post transactions and expenses, and see only their own operational entries.",
  viewer: "Read exchange rates, customer directory, and available currency quantities.",
};

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("operator");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const team = useQuery({ queryKey: ["exchange-team"], queryFn: () => fetchAPI("/api/v1/members") });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["exchange-team"] });

  const invite = useMutation({
    mutationFn: () => fetchAPI("/api/v1/invitations", { method: "POST", body: JSON.stringify({ email, role }) }),
    onSuccess: (result) => {
      setEmail("");
      setPreviewUrl(result.previewUrl || null);
      toast.success(result.previewUrl ? "Invitation created; email delivery is not configured in this environment" : "Invitation sent");
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  async function updateRole(userId, nextRole) {
    try {
      await fetchAPI(`/api/v1/members/${userId}`, { method: "PATCH", body: JSON.stringify({ role: nextRole }) });
      toast.success("Role updated");
      refresh();
    } catch (error) { toast.error(error.message); }
  }

  async function removeMember() {
    if (!memberToRemove) return;
    try {
      await fetchAPI(`/api/v1/members/${memberToRemove.user_id}`, { method: "DELETE" });
      toast.success("Member removed");
      setMemberToRemove(null);
      refresh();
    } catch (error) { toast.error(error.message); }
  }

  async function resendInvitation(id) {
    try {
      const result = await fetchAPI(`/api/v1/invitations/${id}`, { method: "POST" });
      setPreviewUrl(result.previewUrl || null);
      toast.success(result.previewUrl ? "Invitation recreated; use the development preview link" : "Invitation resent");
      refresh();
    } catch (error) { toast.error(error.message); }
  }

  async function revokeInvitation(id) {
    try {
      await fetchAPI(`/api/v1/invitations/${id}`, { method: "DELETE" });
      toast.success("Invitation revoked");
      refresh();
    } catch (error) { toast.error(error.message); }
  }

  return (
    <PermissionGate permission={Permissions.MEMBERS_MANAGE}>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:pt-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Team access</h1>
          <p className="mt-1 text-text-secondary">Invite staff and control exactly what they can see and change.</p>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); invite.mutate(); }} className="mb-8 rounded-xl border border-border-theme bg-surface-raised p-5">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">Invite a member</h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="staff@example.com" className="rounded-xl border border-border-theme bg-surface px-4 py-3 text-text-primary" />
            <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-xl border border-border-theme bg-surface px-3 py-3 text-text-primary">
              {ASSIGNABLE_ROLES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <button disabled={invite.isPending} className="rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50">{invite.isPending ? "Sending..." : "Send invite"}</button>
          </div>
          <p className="mt-3 text-sm text-text-muted">{roleDescription[role]}</p>
          {previewUrl && <p className="mt-3 break-all rounded-lg bg-warning/10 p-3 text-sm text-text-secondary">Development preview: <a className="text-primary underline" href={previewUrl}>{previewUrl}</a></p>}
        </form>

        {team.isLoading ? <p className="text-text-muted">Loading team...</p> : team.isError ? (
          <button onClick={() => team.refetch()} className="text-danger underline">Could not load team. Retry</button>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 text-lg font-semibold text-text-primary">Members</h2>
              <div className="overflow-hidden rounded-xl border border-border-theme bg-surface-raised">
                {team.data.members.map((member) => (
                  <div key={member.user_id} className="flex flex-col gap-3 border-b border-border-theme p-4 last:border-0 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1"><p className="truncate font-medium text-text-primary">{member.email}</p><p className="text-sm capitalize text-text-muted">{member.status}</p></div>
                    {member.role === "owner" ? <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">Owner</span> : (
                      <>
                        <select value={member.role} onChange={(event) => updateRole(member.user_id, event.target.value)} className="rounded-lg border border-border-theme bg-surface px-3 py-2 capitalize text-text-primary">{ASSIGNABLE_ROLES.map((value) => <option key={value} value={value}>{value}</option>)}</select>
                        <button onClick={() => setMemberToRemove(member)} className="text-sm font-medium text-danger">Remove</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
            {team.data.invitations.length > 0 && <section><h2 className="mb-3 text-lg font-semibold text-text-primary">Pending invitations</h2><div className="overflow-hidden rounded-xl border border-border-theme bg-surface-raised">{team.data.invitations.map((invitation) => <div key={invitation.id} className="flex items-center gap-3 border-b border-border-theme p-4 last:border-0"><div className="min-w-0 flex-1"><p className="truncate font-medium text-text-primary">{invitation.email}</p><p className="text-sm capitalize text-text-muted">{invitation.role} · {invitation.status.replaceAll("_", " ")}</p></div><button onClick={() => resendInvitation(invitation.id)} className="text-sm font-medium text-primary">Resend</button><button onClick={() => revokeInvitation(invitation.id)} className="text-sm font-medium text-danger">Revoke</button></div>)}</div></section>}
          </div>
        )}
        <ConfirmDialog
          open={Boolean(memberToRemove)}
          title="Remove team member"
          message={`Remove ${memberToRemove?.email || "this member"} from the Exchange business? Their historical ledger actions will remain in the audit trail.`}
          confirmLabel="Remove"
          onConfirm={removeMember}
          onCancel={() => setMemberToRemove(null)}
        />
      </div>
    </PermissionGate>
  );
}
