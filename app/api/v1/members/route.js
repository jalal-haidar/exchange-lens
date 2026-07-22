import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission, throwAccessDatabaseError } from "@/lib/access/server";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse } from "@/lib/utils/response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request) => {
  const { supabase, organizationId } = await requireExchangePermission(request, Permissions.MEMBERS_MANAGE);
  const [membersResult, invitationsResult] = await Promise.all([
    supabase.schema("exchange").from("organization_members")
      .select("organization_id,user_id,email,role,status,joined_at,updated_at")
      .eq("organization_id", organizationId).order("joined_at", { ascending: true }),
    supabase.schema("exchange").from("organization_invitations")
      .select("id,email,role,status,expires_at,created_at,updated_at")
      .eq("organization_id", organizationId)
      .in("status", ["pending", "delivery_failed"])
      .order("created_at", { ascending: false }),
  ]);
  if (membersResult.error) throwAccessDatabaseError(membersResult.error, "Failed to load team members");
  if (invitationsResult.error) throwAccessDatabaseError(invitationsResult.error, "Failed to load invitations");
  return successResponse({ members: membersResult.data, invitations: invitationsResult.data });
});
