import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission } from "@/lib/access/server";
import { getUtcDateRange } from "@/lib/domain/dateRange";
import { mapLedgerError } from "@/lib/domain/ledgerInput";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { parsePagination, validateUUID } from "@/lib/utils/validation";
import { rateLimit, RateLimitPresets } from "@/lib/middleware";

const readRateLimiter = rateLimit(RateLimitPresets.standard);

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request, { params }) => {
  const rateLimitResult = await readRateLimiter(request);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await params;
  validateUUID(id, "Customer ID");

  const { supabase } = await requireExchangePermission(
    request,
    Permissions.CUSTOMERS_BALANCE_READ,
  );
  const { searchParams } = new URL(request.url);
  const { limit, offset } = parsePagination(searchParams, {
    defaultLimit: 20,
    maxLimit: 100,
  });
  const type = searchParams.get("type");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const timezone = searchParams.get("timezone") || "UTC";

  let range = null;
  if (startDate || endDate) {
    try {
      range = getUtcDateRange(
        startDate || endDate,
        endDate || startDate,
        timezone,
      );
    } catch (rangeError) {
      return errorResponse(rangeError.message, 400);
    }
  }

  const { data, error } = await supabase
    .schema("exchange")
    .rpc("get_customer_financial_summary", {
      p_customer_id: id,
      p_limit: limit,
      p_offset: offset,
      p_start: range?.start ?? null,
      p_end: range?.endExclusive ?? null,
      p_type: type || null,
    });

  if (error) {
    console.error("Customer ledger error", error);
    const mapped = mapLedgerError(error);
    return errorResponse(mapped.message, mapped.status);
  }

  const count = data.total_entries || 0;
  return successResponse({
    data: {
      ledger: data.entries || [],
      balance: data.balance_local,
      receivable: data.receivable_local,
      payable: data.payable_local,
    },
    pagination: {
      total: count,
      limit,
      offset,
      page: Math.floor(offset / limit) + 1,
      hasMore: count > offset + limit,
    },
  });
});
