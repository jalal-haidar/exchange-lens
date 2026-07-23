import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission } from "@/lib/access/server";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { validateUUID } from "@/lib/utils/validation";
import { rateLimit, RateLimitPresets } from "@/lib/middleware";
import { mapLedgerError } from "@/lib/domain/ledgerInput";

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

  const { data: expense, error: lookupError } = await supabase
    .schema("exchange")
    .from("expenses")
    .select("journal_entry_id")
    .eq("id", id)
    .single();
  if (lookupError || !expense?.journal_entry_id) {
    return errorResponse(
      expense ? "Legacy expenses must be corrected before ledger setup" : "Expense not found",
      expense ? 409 : 404,
    );
  }

  const { data, error } = await supabase
    .schema("exchange")
    .rpc("void_financial_entry", {
      p_entry_id: expense.journal_entry_id,
      p_reason: reason,
      p_idempotency_key: crypto.randomUUID(),
    });

  if (error) {
    const mapped = mapLedgerError(error);
    if (mapped.status === 500) {
      console.error("Expense reversal failed", {
        expenseId: id,
        code: error.code,
        details: error.details,
      });
    }
    return errorResponse(mapped.message, mapped.status);
  }

  return successResponse({ data: { reversalEntryId: data } }, 201);
});
