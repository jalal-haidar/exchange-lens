import { requireAuthUser } from "@/lib/auth/helpers";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { rateLimit, RateLimitPresets } from "@/lib/middleware";

const readRateLimiter = rateLimit(RateLimitPresets.standard);
const writeRateLimiter = rateLimit(RateLimitPresets.strict);

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request) => {
  const rateLimitResult = await readRateLimiter(request);
  if (rateLimitResult) return rateLimitResult;

  const { user, supabase } = await requireAuthUser(request);

  // Get latest rates for each currency
  const { data, error } = await supabase
    .schema("exchange")
    .from("rates")
    .select(`
      *,
      currency:currencies(id, code, name, symbol)
    `)
    .eq("user_id", user.id)
    .order("effective_at", { ascending: false });

  if (error) {
    return errorResponse("Failed to fetch rates", 500);
  }

  // Deduplicate to get only latest rate per currency
  const latestRates = {};
  data.forEach((rate) => {
    const currencyId = rate.currency_id;
    if (!latestRates[currencyId]) {
      latestRates[currencyId] = rate;
    }
  });

  return successResponse({ data: { rates: Object.values(latestRates) } });
});

export const POST = asyncHandler(async (request) => {
  const rateLimitResult = await writeRateLimiter(request);
  if (rateLimitResult) return rateLimitResult;

  const { user, supabase } = await requireAuthUser(request);
  const body = await request.json();

  if (!body.rates || !Array.isArray(body.rates)) {
    return errorResponse("Rates array is required", 400);
  }

  const inserts = body.rates.map((r) => ({
    user_id: user.id,
    currency_id: r.currency_id,
    buy_rate: Number(r.buy_rate),
    sell_rate: Number(r.sell_rate),
    effective_at: r.effective_at || new Date().toISOString(),
  }));

  // Validate
  for (const insert of inserts) {
    if (!insert.currency_id) return errorResponse("Currency ID is required for each rate", 400);
    if (isNaN(insert.buy_rate) || isNaN(insert.sell_rate)) {
      return errorResponse("Buy and sell rates must be valid numbers", 400);
    }
    if (insert.buy_rate <= 0 || insert.sell_rate <= 0) {
      return errorResponse("Rates must be positive", 400);
    }
  }

  const { data, error } = await supabase
    .schema("exchange")
    .from("rates")
    .insert(inserts)
    .select();

  if (error) {
    return errorResponse("Failed to update rates", 500);
  }

  return successResponse({ data: { rates: data } }, 201);
});
