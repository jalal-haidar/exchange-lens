import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission } from "@/lib/access/server";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { validateUUID } from "@/lib/utils/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request) => {
  const { supabase, organizationId } = await requireExchangePermission(request, Permissions.RATES_READ);
  const { searchParams } = new URL(request.url);
  const currencyId = searchParams.get("currency_id");

  if (currencyId) {
    validateUUID(currencyId, "Currency ID");
  }

  let query = supabase
    .schema("exchange")
    .from("rates")
    .select(`
      *,
      currency:currencies(id, code, name, symbol)
    `)
    .eq("organization_id", organizationId)
    .order("effective_at", { ascending: false });

  if (currencyId) {
    query = query.eq("currency_id", currencyId);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    return errorResponse("Failed to fetch rate history", 500);
  }

  return successResponse({ data: { rates: data } });
});
