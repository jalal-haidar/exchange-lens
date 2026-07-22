import { getExchangeAccessContext, throwAccessDatabaseError } from "@/lib/access/server";
import { hashInvitationToken } from "@/lib/access/invitations";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse } from "@/lib/utils/response";
import { AppError } from "@/lib/errors";

export const POST = asyncHandler(async (request) => {
  const { supabase, access } = await getExchangeAccessContext(request);
  if (access?.state === "active") throw AppError.alreadyExists("Exchange organization membership");
  const body = await request.json();
  const token = String(body.token || "");
  if (token.length < 32 || token.length > 200) throw AppError.validationFailed("Invalid invitation token");
  const { data, error } = await supabase.schema("exchange").rpc("accept_organization_invitation", {
    p_token_hash: hashInvitationToken(token),
  });
  if (error) throwAccessDatabaseError(error, "Failed to accept invitation");
  return successResponse({ member: data });
});
