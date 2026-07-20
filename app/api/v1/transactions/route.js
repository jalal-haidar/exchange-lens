import { requireAuthUser } from "@/lib/auth/helpers";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { parsePagination, validateUUID } from "@/lib/utils/validation";
import { rateLimit, RateLimitPresets } from "@/lib/middleware";

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
      currency:currencies(id, code, name, symbol)
    `, { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (type) query = query.eq("type", type);
  if (customerId) query = query.eq("customer_id", customerId);
  if (currencyId) query = query.eq("currency_id", currencyId);
  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);

  if (search) {
    query = query.or(`description.ilike.%${search}%,reference_number.ilike.%${search}%`);
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

  // Validation
  if (!body.type) return errorResponse("Transaction type is required", 400);
  if (!body.currency_id) return errorResponse("Currency is required", 400);
  if (!body.amount_local || Number(body.amount_local) <= 0) {
    return errorResponse("Amount is required and must be positive", 400);
  }

  const validTypes = ["buy", "sell", "credit_given", "credit_received", "expense"];
  if (!validTypes.includes(body.type)) {
    return errorResponse("Invalid transaction type", 400);
  }

  // Validate currency exists
  validateUUID(body.currency_id, "Currency ID");

  const { data: currency, error: currencyError } = await supabase
    .schema("exchange")
    .from("currencies")
    .select("id")
    .eq("id", body.currency_id)
    .single();

  if (currencyError || !currency) {
    return errorResponse("Currency not found", 404);
  }

  // For buy/sell, customer_id is required
  if (["buy", "sell", "credit_given", "credit_received"].includes(body.type) && !body.customer_id) {
    return errorResponse("Customer is required for this transaction type", 400);
  }

  if (body.customer_id) {
    validateUUID(body.customer_id, "Customer ID");
  }

  const transactionData = {
    user_id: user.id,
    customer_id: body.customer_id || null,
    currency_id: body.currency_id,
    type: body.type,
    amount_foreign: Number(body.amount_foreign) || 0,
    amount_local: Number(body.amount_local),
    rate: body.rate ? Number(body.rate) : null,
    description: body.description || null,
    reference_number: body.reference_number || null,
  };

  const { data, error } = await supabase
    .schema("exchange")
    .from("transactions")
    .insert(transactionData)
    .select(`
      *,
      customer:customers(id, name, phone),
      currency:currencies(id, code, name, symbol)
    `)
    .single();

  if (error) {
    return errorResponse("Failed to create transaction", 500);
  }

  return successResponse({ data: { transaction: data } }, 201);
});
