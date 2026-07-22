import { requireAuthUser } from "@/lib/auth/helpers";
import { calculateCustomerOutstanding } from "@/lib/domain/accounting";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { parsePagination, validateUUID } from "@/lib/utils/validation";
import { rateLimit, RateLimitPresets } from "@/lib/middleware";
import { TRANSACTION_TYPES } from "@/lib/shared/constants";

const readRateLimiter = rateLimit(RateLimitPresets.standard);
const CREDIT_TYPES = [TRANSACTION_TYPES.CREDIT_GIVEN, TRANSACTION_TYPES.CREDIT_RECEIVED];

export const dynamic = "force-dynamic";
export const revalidate = 0;

function chronologicalKey(transaction) {
  return [
    transaction.posted_at || transaction.created_at,
    transaction.created_at,
    transaction.id,
  ].join("|");
}

export const GET = asyncHandler(async (request, { params }) => {
  const rateLimitResult = await readRateLimiter(request);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await params;
  validateUUID(id, "Customer ID");

  const { user, supabase } = await requireAuthUser(request);
  const { searchParams } = new URL(request.url);
  const { limit, offset } = parsePagination(searchParams, { defaultLimit: 20, maxLimit: 100 });
  const type = searchParams.get("type");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  let ledgerQuery = supabase
    .schema("exchange")
    .from("transactions")
    .select(`
      *,
      currency:currencies(id, code, name, symbol),
      reversal:transaction_reversals(id, reason, created_at)
    `, { count: "exact" })
    .eq("customer_id", id)
    .eq("user_id", user.id)
    .neq("type", "expense")
    .is("reversal", null)
    .order("posted_at", { ascending: false });

  if (type) ledgerQuery = ledgerQuery.eq("type", type);
  if (startDate) ledgerQuery = ledgerQuery.gte("posted_at", startDate);
  if (endDate) ledgerQuery = ledgerQuery.lte("posted_at", endDate);

  const [ledgerResult, creditsResult] = await Promise.all([
    ledgerQuery.range(offset, offset + limit - 1),
    supabase
      .schema("exchange")
      .from("transactions")
      .select("id, type, amount_local, posted_at, created_at, reversal:transaction_reversals(id)")
      .eq("customer_id", id)
      .eq("user_id", user.id)
      .in("type", CREDIT_TYPES)
      .is("reversal", null)
      .order("posted_at", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (ledgerResult.error || creditsResult.error) {
    console.error("Customer ledger error", {
      ledger: ledgerResult.error,
      credits: creditsResult.error,
    });
    return errorResponse("Failed to fetch ledger", 500);
  }

  const credits = creditsResult.data || [];
  const ledger = (ledgerResult.data || []).map((transaction) => {
    const key = chronologicalKey(transaction);
    const creditsAtTransaction = credits.filter(
      (credit) => chronologicalKey(credit) <= key,
    );
    return {
      ...transaction,
      running_balance: calculateCustomerOutstanding(creditsAtTransaction),
    };
  });
  const balance = calculateCustomerOutstanding(credits);
  const count = ledgerResult.count || 0;

  return successResponse({
    data: { ledger, balance },
    pagination: {
      total: count,
      limit,
      offset,
      page: Math.floor(offset / limit) + 1,
      hasMore: count > offset + limit,
    },
  });
});
