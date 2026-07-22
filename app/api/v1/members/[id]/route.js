import { Permissions, ASSIGNABLE_ROLES } from "@/lib/access/permissions";
import { requireExchangePermission, throwAccessDatabaseError } from "@/lib/access/server";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse } from "@/lib/utils/response";
import { validateUUID } from "@/lib/utils/validation";
import { AppError } from "@/lib/errors";

export const PATCH = asyncHandler(async (request, { params }) => {
  const { id } = await params;
  validateUUID(id, "member ID");
  const { supabase } = await requireExchangePermission(request, Permissions.MEMBERS_MANAGE);
  const body = await request.json();
  if (!ASSIGNABLE_ROLES.includes(body.role)) throw AppError.validationFailed("Invalid member role");
  const { data, error } = await supabase.schema("exchange").rpc("update_organization_member_role", {
    p_member_user_id: id,
    p_role: body.role,
  });
  if (error) throwAccessDatabaseError(error, "Failed to update member role");
  return successResponse({ member: data });
});

export const DELETE = asyncHandler(async (request, { params }) => {
  const { id } = await params;
  validateUUID(id, "member ID");
  const { supabase } = await requireExchangePermission(request, Permissions.MEMBERS_MANAGE);
  const { data, error } = await supabase.schema("exchange").rpc("remove_organization_member", {
    p_member_user_id: id,
  });
  if (error) throwAccessDatabaseError(error, "Failed to remove member");
  return successResponse({ member: data });
});
