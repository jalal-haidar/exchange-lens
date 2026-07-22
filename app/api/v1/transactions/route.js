import { requireAuthUser } from "@/lib/auth/helpers";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { parsePagination } from "@/lib/utils/validation";
import { rateLimit, RateLimitPresets } from "@/lib/middleware";
import { prepareTransactionInput } from "@/lib/domain/transactionInput";

const readRateLimiter = rateLimit(RateLimitPresets.standard);
const writeRateLimiter = rateLimit(RateLimitPresets.strict);

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request) => {
  const rateLimitResult = await readRateLimiter(request);
  if (rateLimitResult) return rateLimitResult;

  const { user, supabase } = await requireAuthUser(request);
  const { searchParams } = new URL(request.url);
  const { limit, offset } = parsePagination(searchParams, { defaultLimit: 20, maxLimit: 50 });

  const type = searchParams.get("type");
  const customerId = searchParams.get("customer_id");
  const currencyId = searchParams.get("currency_id");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const search = searchParams.get("search") || "";

  let query = supabase
    .schema("exchange")
    .from("transactions")
    .select(`
      *,
      customer:customers(id, name, phone),
      currency:currencies(id, code, name, symbol),
      reversal:transaction_reversals(id, reason, created_at)
    `, { count: "exact" })
    .eq("user_id", user.id)
    .neq("type", "expense")
    .is("reversal", null)
    .order("posted_at", { ascending: false });

  if (type) query = query.eq("type", type);
  if (customerId) query = query.eq("customer_id", customerId);
  if (currencyId) query = query.eq("currency_id", currencyId);
  if (startDate) query = query.gte("posted_at", startDate);
  if (endDate) query = query.lte("posted_at", endDate);

  if (search) {
    const safeSearch = search.slice(0, 100).replace(/[,().%]/g, " ").trim();
    if (safeSearch) query = query.or(`description.ilike.%${safeSearch}%,reference_number.ilike.%${safeSearch}%`);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    return errorResponse("Failed to fetch transactions", 500);
  }

  return successResponse({
    data: { transactions: data },
    pagination: { total: count || 0, limit, offset, page: Math.floor(offset / limit) + 1, hasMore: (count || 0) > offset + limit },
  });
});

export const POST = asyncHandler(async (request) => {
  const rateLimitResult = await writeRateLimiter(request);
  if (rateLimitResult) return rateLimitResult;

  const { user, supabase } = await requireAuthUser(request);
  const body = await request.json();

  let transactionInput;
  try {
    transactionInput = prepareTransactionInput(body);
  } catch (error) {
    return errorResponse(error.message, 400);
  }

  const { data: postedTransaction, error: postError } = await supabase
    .schema("exchange")
    .rpc("post_transaction", transactionInput)
    .single();

  if (postError) {
    if (postError.code === "P0002") {
      return errorResponse(postError.message, 404);
    }
    if (["22003", "22023"].includes(postError.code)) {
      return errorResponse(postError.message, 400);
    }
    if (["23505", "23514"].includes(postError.code)) {
      return errorResponse(postError.message, 409);
    }

    console.error("Transaction posting failed", {
      code: postError.code,
      details: postError.details,
    });
    return errorResponse("Failed to create transaction", 500);
  }

  const { data: hydratedTransaction, error: hydrateError } = await supabase
    .schema("exchange")
    .from("transactions")
    .select(`
      *,
      customer:customers(id, name, phone),
      currency:currencies(id, code, name, symbol)
    `)
    .eq("id", postedTransaction.id)
    .eq("user_id", user.id)
    .single();

  if (hydrateError) {
    console.error("Transaction hydration failed", {
      transactionId: postedTransaction.id,
      code: hydrateError.code,
    });
  }

  return successResponse({
    data: { transaction: hydratedTransaction || postedTransaction },
  }, 201);
});
