import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission } from "@/lib/access/server";
import { getUtcDateRange } from "@/lib/domain/dateRange";
import { mapLedgerError } from "@/lib/domain/ledgerInput";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { validateUUID } from "@/lib/utils/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request) => {
  const { supabase, organizationId } = await requireExchangePermission(
    request,
    Permissions.FINANCIAL_REPORTS_READ,
  );
  const { searchParams } = new URL(request.url);

  const customerId = searchParams.get("customer_id");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const timezone = searchParams.get("timezone") || "UTC";

  if (!customerId) return errorResponse("Customer ID is required", 400);
  validateUUID(customerId, "Customer ID");

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

  const [statementResult, customerResult] = await Promise.all([
    supabase
      .schema("exchange")
      .rpc("get_customer_financial_summary", {
        p_customer_id: customerId,
        p_limit: 500,
        p_offset: 0,
        p_start: range?.start ?? null,
        p_end: range?.endExclusive ?? null,
        p_type: null,
      }),
    supabase
      .schema("exchange")
      .from("customers")
      .select("id, name, phone, email")
      .eq("id", customerId)
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);

  if (statementResult.error) {
    const mapped = mapLedgerError(statementResult.error);
    return errorResponse(mapped.message, mapped.status);
  }
  if (customerResult.error) {
    return errorResponse("Failed to fetch customer", 500);
  }
  if (!customerResult.data) {
    return errorResponse("Customer not found", 404);
  }

  const statement = statementResult.data;
  return successResponse({
    data: {
      customer: customerResult.data,
      statement: statement.entries || [],
      summary: {
        totalTransactions: statement.total_entries || 0,
        receivable: statement.receivable_local,
        payable: statement.payable_local,
        openingBalance: statement.opening_balance_local,
        periodChange: statement.period_delta_local,
        finalBalance: statement.closing_balance_local,
      },
    },
  });
});
