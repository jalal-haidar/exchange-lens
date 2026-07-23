import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission } from "@/lib/access/server";
import {
  optionalUuid,
  requireDecimal,
  requireSignedDecimal,
  requireTimestamp,
  requireUuid,
  mapLedgerError,
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
      p_account_id: requireUuid(body.account_id, "Account"),
      p_balance: requireSignedDecimal(body.balance, "Opening balance", {
        scale: 8,
        allowZero: true,
      }),
      p_cost_local: body.cost_local === "" || body.cost_local == null
        ? null
        : requireDecimal(body.cost_local, "Local carrying cost", {
          scale: 2,
          allowZero: true,
        }),
      p_effective_at: requireTimestamp(body.effective_at, "Effective time"),
      p_idempotency_key: optionalUuid(body.idempotency_key, "Idempotency key")
        || crypto.randomUUID(),
    };
  } catch (error) {
    return errorResponse(error.message, 400);
  }
  const { data, error } = await supabase
    .schema("exchange")
    .rpc("set_account_opening_balance", input)
    .single();
  if (error) {
    const mapped = mapLedgerError(error);
    return errorResponse(mapped.message, mapped.status);
  }
  return successResponse({ data: { account: data } });
});
