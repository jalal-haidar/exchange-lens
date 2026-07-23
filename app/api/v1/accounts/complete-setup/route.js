import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission } from "@/lib/access/server";
import { mapLedgerError } from "@/lib/domain/ledgerInput";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { errorResponse, successResponse } from "@/lib/utils/response";

export const POST = asyncHandler(async (request) => {
  const { supabase } = await requireExchangePermission(
    request,
    Permissions.ACCOUNTS_MANAGE,
  );
  const { data, error } = await supabase
    .schema("exchange")
    .rpc("complete_financial_setup")
    .single();
  if (error) {
    const mapped = mapLedgerError(error);
    return errorResponse(mapped.message, mapped.status);
  }
  return successResponse({ data: { organization: data } });
});
