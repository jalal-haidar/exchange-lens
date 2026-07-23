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
    Permissions.TRANSFERS_POST,
  );
  const body = await request.json();
  let input;
  try {
    input = {
      p_idempotency_key: requireUuid(body.idempotency_key, "Idempotency key"),
      p_source_account_id: requireUuid(body.source_account_id, "Source account"),
      p_destination_account_id: requireUuid(
        body.destination_account_id,
        "Destination account",
      ),
      p_amount_currency: requireDecimal(body.amount_currency, "Amount", { scale: 8 }),
      p_description: optionalText(body.description),
      p_reference_number: optionalText(body.reference_number, 120),
      p_posted_at: requireTimestamp(body.posted_at),
    };
  } catch (error) {
    return errorResponse(error.message, 400);
  }
  const { data, error } = await supabase
    .schema("exchange")
    .rpc("post_account_transfer", input)
    .single();
  if (error) {
    const mapped = mapLedgerError(error);
    return errorResponse(mapped.message, mapped.status);
  }
  return successResponse({ data: { transfer: data } }, 201);
});
