import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission } from "@/lib/access/server";
import {
  mapLedgerError,
  optionalText,
  requireDecimal,
  requireTimestamp,
  requireUuid,
} from "@/lib/domain/ledgerInput";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { errorResponse, successResponse } from "@/lib/utils/response";

export const POST = asyncHandler(async (request) => {
  const { supabase } = await requireExchangePermission(
    request,
    Permissions.SETTLEMENTS_POST,
  );
  const body = await request.json();
  let input;
  try {
    input = {
      p_idempotency_key: requireUuid(body.idempotency_key, "Idempotency key"),
      p_customer_id: requireUuid(body.customer_id, "Customer"),
      p_account_id: requireUuid(body.account_id, "Account"),
      p_direction: body.direction,
      p_amount_local: requireDecimal(body.amount_local, "Amount", { scale: 2 }),
      p_allocations: (body.allocations || []).map((allocation) => ({
        transaction_id: requireUuid(allocation.transaction_id, "Trade"),
        amount: requireDecimal(allocation.amount, "Allocation", { scale: 2 }),
      })),
      p_description: optionalText(body.description),
      p_reference_number: optionalText(body.reference_number, 120),
      p_posted_at: requireTimestamp(body.posted_at),
    };
  } catch (error) {
    return errorResponse(error.message, 400);
  }
  const { data, error } = await supabase
    .schema("exchange")
    .rpc("post_customer_settlement", input)
    .single();
  if (error) {
    const mapped = mapLedgerError(error);
    return errorResponse(mapped.message, mapped.status);
  }
  return successResponse({ data: { settlement: data } }, 201);
});
