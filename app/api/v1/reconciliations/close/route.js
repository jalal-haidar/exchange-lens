import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission } from "@/lib/access/server";
import {
  mapLedgerError,
  optionalText,
  requireSignedDecimal,
  requireUuid,
} from "@/lib/domain/ledgerInput";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { errorResponse, successResponse } from "@/lib/utils/response";

export const POST = asyncHandler(async (request) => {
  const { supabase } = await requireExchangePermission(
    request,
    Permissions.RECONCILIATIONS_CLOSE,
  );
  const body = await request.json();
  let input;
  try {
    if (!Array.isArray(body.counts) || body.counts.length === 0) {
      throw new TypeError("Every active account must be counted");
    }
    input = {
      p_business_date: body.business_date,
      p_counts: body.counts.map((count) => ({
        account_id: requireUuid(count.account_id, "Account"),
        counted_balance: requireSignedDecimal(count.counted_balance, "Counted balance", {
          scale: 8,
          allowZero: true,
        }),
        reason: optionalText(count.reason),
      })),
      p_notes: optionalText(body.notes),
      p_idempotency_key: requireUuid(body.idempotency_key, "Idempotency key"),
    };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.p_business_date || "")) {
      throw new TypeError("Business date must be valid");
    }
  } catch (error) {
    return errorResponse(error.message, 400);
  }
  const { data, error } = await supabase
    .schema("exchange")
    .rpc("close_business_day", input)
    .single();
  if (error) {
    const mapped = mapLedgerError(error);
    return errorResponse(mapped.message, mapped.status);
  }
  return successResponse({ data: { closure: data } }, 201);
});
