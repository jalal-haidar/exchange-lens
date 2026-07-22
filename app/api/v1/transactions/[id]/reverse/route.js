import { requireAuthUser } from "@/lib/auth/helpers";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { validateUUID } from "@/lib/utils/validation";
import { rateLimit, RateLimitPresets } from "@/lib/middleware";

const writeRateLimiter = rateLimit(RateLimitPresets.strict);

export const POST = asyncHandler(async (request, { params }) => {
  const rateLimitResult = await writeRateLimiter(request);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await params;
  validateUUID(id, "Transaction ID");
  const { supabase } = await requireAuthUser(request);
  const body = await request.json();
  const reason = body.reason?.trim();

  if (!reason || reason.length < 3) {
    return errorResponse("Reversal reason must be at least 3 characters", 400);
  }

  const { data, error } = await supabase
    .schema("exchange")
    .rpc("reverse_transaction", {
      p_transaction_id: id,
      p_reason: reason,
    })
    .single();

  if (error) {
    if (error.code === "P0002") {
      return errorResponse(error.message, 404);
    }
    if (["22023", "23514"].includes(error.code)) {
      return errorResponse(error.message, 409);
    }

    console.error("Transaction reversal failed", {
      transactionId: id,
      code: error.code,
      details: error.details,
    });
    return errorResponse("Failed to reverse transaction", 500);
  }

  return successResponse({ data: { reversal: data } }, 201);
});
