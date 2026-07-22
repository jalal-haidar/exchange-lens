import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission } from "@/lib/access/server";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { validateUUID } from "@/lib/utils/validation";
import { rateLimit, RateLimitPresets } from "@/lib/middleware";

const writeRateLimiter = rateLimit(RateLimitPresets.strict);

export const POST = asyncHandler(async (request, { params }) => {
  const rateLimitResult = await writeRateLimiter(request);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await params;
  validateUUID(id, "Expense ID");
  const { supabase } = await requireExchangePermission(request, Permissions.EXPENSES_REVERSE);
  const body = await request.json();
  const reason = body.reason?.trim();

  if (!reason || reason.length < 3) {
    return errorResponse("Reversal reason must be at least 3 characters", 400);
  }

  const { data, error } = await supabase
    .schema("exchange")
    .rpc("reverse_expense", {
      p_expense_id: id,
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

    console.error("Expense reversal failed", {
      expenseId: id,
      code: error.code,
      details: error.details,
    });
    return errorResponse("Failed to reverse expense", 500);
  }

  return successResponse({ data: { reversal: data } }, 201);
});
