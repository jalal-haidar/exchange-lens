import { requireAuthUser } from "@/lib/auth/helpers";
import { calculateCustomerOutstanding } from "@/lib/domain/accounting";
import { getUtcDateRange } from "@/lib/domain/dateRange";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { validateUUID } from "@/lib/utils/validation";
import { TRANSACTION_TYPES } from "@/lib/shared/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CREDIT_TYPES = [TRANSACTION_TYPES.CREDIT_GIVEN, TRANSACTION_TYPES.CREDIT_RECEIVED];

function isActive(entry) {
  return !entry.reversal || (Array.isArray(entry.reversal) && entry.reversal.length === 0);
}

export const GET = asyncHandler(async (request) => {
  const { user, supabase } = await requireAuthUser(request);
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
      range = getUtcDateRange(startDate || endDate, endDate || startDate, timezone);
    } catch (rangeError) {
      return errorResponse(rangeError.message, 400);
    }
  }

  let query = supabase
    .schema("exchange")
    .from("transactions")
    .select(`
      *,
      customer:customers(id, name, phone),
      currency:currencies(id, code, symbol),
      reversal:transaction_reversals(id)
    `)
    .eq("user_id", user.id)
    .eq("customer_id", customerId)
    .neq("type", TRANSACTION_TYPES.EXPENSE)
    .order("posted_at", { ascending: true })
    .order("created_at", { ascending: true });

  if (range) {
    query = query.gte("posted_at", range.start).lt("posted_at", range.endExclusive);
  }

  const { data: transactions, error } = await query;

  if (error) {
    return errorResponse("Failed to fetch customer statement", 500);
  }

  const activeTransactions = (transactions || []).filter(isActive);
  const credits = [];
  const statement = activeTransactions.map((transaction) => {
    if (CREDIT_TYPES.includes(transaction.type)) {
      credits.push(transaction);
    }
    return {
      ...transaction,
      running_balance: calculateCustomerOutstanding(credits),
    };
  });

  // Get customer info
  const { data: customer } = await supabase
    .schema("exchange")
    .from("customers")
    .select("id, name, phone, email")
    .eq("id", customerId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!customer) {
    return errorResponse("Customer not found", 404);
  }

  return successResponse({
    data: {
      customer,
      statement,
      summary: {
        totalTransactions: activeTransactions.length,
        finalBalance: calculateCustomerOutstanding(credits),
      },
    },
  });
});
