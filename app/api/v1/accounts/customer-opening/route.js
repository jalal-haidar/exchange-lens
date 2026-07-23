import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission } from "@/lib/access/server";
import {
  mapLedgerError,
  requireDecimal,
  requireTimestamp,
  requireUuid,
} from "@/lib/domain/ledgerInput";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { errorResponse, successResponse } from "@/lib/utils/response";

export const POST = asyncHandler(async (request) => {
  const { supabase } = await requireExchangePermission(
    request,
    Permissions.ACCOUNTS_MANAGE,
  );
  const body = await request.json();
  let input;
  try {
    input = {
      p_customer_id: requireUuid(body.customer_id, "Customer"),
      p_receivable: requireDecimal(body.receivable ?? "0", "Receivable", {
        scale: 2,
        allowZero: true,
      }),
      p_payable: requireDecimal(body.payable ?? "0", "Payable", {
        scale: 2,
        allowZero: true,
      }),
      p_effective_at: requireTimestamp(body.effective_at, "Effective time"),
      p_idempotency_key: requireUuid(body.idempotency_key, "Idempotency key"),
    };
  } catch (error) {
    return errorResponse(error.message, 400);
  }
  const { data, error } = await supabase
    .schema("exchange")
    .rpc("set_customer_opening_balance", input);
  if (error) {
    const mapped = mapLedgerError(error);
    return errorResponse(mapped.message, mapped.status);
  }
  return successResponse({ data: { journalEntryId: data } });
});
