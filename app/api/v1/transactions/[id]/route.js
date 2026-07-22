import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission } from "@/lib/access/server";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { validateUUID } from "@/lib/utils/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request, { params }) => {
  const { id } = await params;
  validateUUID(id, "Transaction ID");

  const { supabase, organizationId } = await requireExchangePermission(request, [Permissions.OPERATIONS_READ_ALL, Permissions.TRANSACTIONS_READ_OWN]);

  const { data, error } = await supabase
    .schema("exchange")
    .from("transactions")
    .select(`
      *,
      customer:customers(id, name, phone, email),
      currency:currencies(id, code, name, symbol),
      reversal:transaction_reversals(id, reason, created_at)
    `)
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (error || !data) {
    return errorResponse("Transaction not found", 404);
  }

  return successResponse({ data: { transaction: data } });
});
