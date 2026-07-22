import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission, throwAccessDatabaseError } from "@/lib/access/server";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse } from "@/lib/utils/response";
import { validateUUID } from "@/lib/utils/validation";
import {
  buildInvitationUrl,
  createInvitationToken,
  hashInvitationToken,
  sendOrganizationInvitation,
} from "@/lib/access/invitations";

export const DELETE = asyncHandler(async (request, { params }) => {
  const { id } = await params;
  validateUUID(id, "invitation ID");
  const { supabase } = await requireExchangePermission(request, Permissions.MEMBERS_MANAGE);
  const { data, error } = await supabase.schema("exchange").rpc("revoke_organization_invitation", {
    p_invitation_id: id,
  });
  if (error) throwAccessDatabaseError(error, "Failed to revoke invitation");
  return successResponse({ invitation: data });
});

export const POST = asyncHandler(async (request, { params }) => {
  const { id } = await params;
  validateUUID(id, "invitation ID");
  const { supabase, organizationId, access } = await requireExchangePermission(request, Permissions.MEMBERS_MANAGE);
  const { data: previous, error: lookupError } = await supabase
    .schema("exchange")
    .from("organization_invitations")
    .select("email,role")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .in("status", ["pending", "delivery_failed"])
    .maybeSingle();
  if (lookupError || !previous) throwAccessDatabaseError(lookupError || { code: "P0002" }, "Invitation not found");

  const token = createInvitationToken();
  const { data: invitation, error } = await supabase.schema("exchange").rpc("create_organization_invitation", {
    p_email: previous.email,
    p_role: previous.role,
    p_token_hash: hashInvitationToken(token),
    p_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error) throwAccessDatabaseError(error, "Failed to recreate invitation");

  const invitationUrl = buildInvitationUrl(token);
  try {
    const delivery = await sendOrganizationInvitation({
      email: previous.email,
      role: previous.role,
      organizationName: access.organization.name,
      invitationUrl,
    });
    await supabase.schema("exchange").rpc("set_invitation_delivery_status", {
      p_invitation_id: invitation.id,
      p_delivered: delivery.delivered,
    });
    return successResponse({
      invitation: { ...invitation, status: delivery.delivered ? "pending" : "delivery_failed" },
      previewUrl: process.env.NODE_ENV === "production" ? null : delivery.previewUrl,
    });
  } catch (deliveryError) {
    await supabase.schema("exchange").rpc("set_invitation_delivery_status", {
      p_invitation_id: invitation.id,
      p_delivered: false,
    });
    throw deliveryError;
  }
});
