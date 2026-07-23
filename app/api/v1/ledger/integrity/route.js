import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission } from "@/lib/access/server";
import { mapLedgerError } from "@/lib/domain/ledgerInput";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { errorResponse, successResponse } from "@/lib/utils/response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request) => {
  const { supabase } = await requireExchangePermission(
    request,
    Permissions.INTEGRITY_READ,
  );
  const { data, error } = await supabase
    .schema("exchange")
    .rpc("check_financial_integrity");
  if (error) {
    const mapped = mapLedgerError(error);
    return errorResponse(mapped.message, mapped.status);
  }
  return successResponse({ data: { integrity: data } });
});
