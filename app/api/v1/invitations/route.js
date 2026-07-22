import { Permissions, ASSIGNABLE_ROLES } from "@/lib/access/permissions";
import { requireExchangePermission, throwAccessDatabaseError } from "@/lib/access/server";
import {
  buildInvitationUrl,
  createInvitationToken,
  hashInvitationToken,
  sendOrganizationInvitation,
} from "@/lib/access/invitations";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse } from "@/lib/utils/response";
import { AppError } from "@/lib/errors";

export const POST = asyncHandler(async (request) => {
  const { supabase, access } = await requireExchangePermission(request, Permissions.MEMBERS_MANAGE);
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const role = body.role;
  if (!/^\S+@\S+\.\S+$/.test(email)) throw AppError.validationFailed("A valid email is required");
  if (!ASSIGNABLE_ROLES.includes(role)) throw AppError.validationFailed("Invalid invitation role");

  const token = createInvitationToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: invitation, error } = await supabase.schema("exchange").rpc("create_organization_invitation", {
    p_email: email,
    p_role: role,
    p_token_hash: hashInvitationToken(token),
    p_expires_at: expiresAt,
  });
  if (error) throwAccessDatabaseError(error, "Failed to create invitation");

  const invitationUrl = buildInvitationUrl(token);
  try {
    const delivery = await sendOrganizationInvitation({
      email,
      role,
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
    }, 201);
  } catch (deliveryError) {
    await supabase.schema("exchange").rpc("set_invitation_delivery_status", {
      p_invitation_id: invitation.id,
      p_delivered: false,
    });
    throw deliveryError;
  }
});
