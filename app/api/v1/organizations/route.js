import { getExchangeAccessContext, throwAccessDatabaseError } from "@/lib/access/server";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse } from "@/lib/utils/response";
import { sanitizeString } from "@/lib/utils/validation";
import { AppError } from "@/lib/errors";

export const POST = asyncHandler(async (request) => {
  const { supabase, access } = await getExchangeAccessContext(request);
  if (access?.state !== "onboarding") {
    throw AppError.alreadyExists("Exchange organization");
  }
  const body = await request.json();
  const name = sanitizeString(body.name || "");
  if (name.length < 2 || name.length > 120) {
    throw AppError.validationFailed("Business name must contain 2 to 120 characters");
  }
  const { data, error } = await supabase.schema("exchange").rpc("create_organization", {
    p_name: name,
  });
  if (error) throwAccessDatabaseError(error, "Failed to create Exchange organization");
  return successResponse({ organization: data }, 201);
});
