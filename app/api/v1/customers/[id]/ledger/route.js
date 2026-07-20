import { requireAuthUser } from "@/lib/auth/helpers";
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

  const { user, supabase } = await requireAuthUser(request);
  const { searchParams } = new URL(request.url);
  const { limit, offset } = parsePagination(searchParams, { defaultLimit: 20, maxLimit: 100 });

  const type = searchParams.get("type");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  let query = supabase
    .schema("exchange")
    .from("transactions")
    .select(`
      *,
      currency:currencies(id, code, name, symbol)
    `, { count: "exact" })
    .eq("customer_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (type) {
    query = query.eq("type", type);
  }

  if (startDate) {
    query = query.gte("created_at", startDate);
  }

  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    return errorResponse("Failed to fetch ledger", 500);
  }

  // Calculate running balance
  let balance = 0;
  const ledger = [...data].reverse().map((t) => {
    if (t.type === "sell" || t.type === "credit_given") {
      balance -= Number(t.amount_local);
    } else if (t.type === "buy" || t.type === "credit_received") {
      balance += Number(t.amount_local);
    }
    return { ...t, running_balance: balance };
  }).reverse();

  return successResponse({
    data: { ledger, balance },
    pagination: { total: count || 0, limit, offset, page: Math.floor(offset / limit) + 1, hasMore: (count || 0) > offset + limit },
  });
});
