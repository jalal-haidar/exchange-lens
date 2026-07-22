import { requireAuthUser } from "@/lib/auth/helpers";
import { prepareOpeningPositionInput } from "@/lib/domain/positionInput";
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
  const [currenciesResult, positionsResult] = await Promise.all([
    supabase
      .schema("exchange")
      .from("currencies")
      .select("id, code, name, symbol")
      .eq("is_active", true)
      .order("code"),
    supabase
      .schema("exchange")
      .from("currency_positions")
      .select("*")
      .eq("user_id", user.id),
  ]);

  if (currenciesResult.error || positionsResult.error) {
    console.error("Currency position list error", {
      currencies: currenciesResult.error,
      positions: positionsResult.error,
    });
    return errorResponse("Failed to fetch currency positions", 500);
  }

  const positionByCurrency = new Map(
    (positionsResult.data || []).map((position) => [position.currency_id, position]),
  );
  const positions = (currenciesResult.data || []).map((currency) => ({
    currency,
    ...(positionByCurrency.get(currency.id) || {
      currency_id: currency.id,
      opening_quantity: "0.00",
      opening_cost_local: "0.00",
      opening_effective_at: null,
      quantity: "0.00",
      total_cost_local: "0.00",
    }),
  }));

  return successResponse({ data: { positions } });
});

export const POST = asyncHandler(async (request) => {
  const rateLimitResult = await writeRateLimiter(request);
  if (rateLimitResult) return rateLimitResult;

  const { supabase } = await requireAuthUser(request);
  const body = await request.json();
  let input;
  try {
    input = prepareOpeningPositionInput(body);
  } catch (error) {
    return errorResponse(error.message, 400);
  }

  const { data, error } = await supabase
    .schema("exchange")
    .rpc("set_opening_position", input)
    .single();

  if (error) {
    if (error.code === "P0002") return errorResponse(error.message, 404);
    if (["22003", "22023"].includes(error.code)) return errorResponse(error.message, 400);
    if (error.code === "23514") return errorResponse(error.message, 409);

    console.error("Set opening position failed", { code: error.code, details: error.details });
    return errorResponse("Failed to set opening position", 500);
  }

  return successResponse({ data: { position: data } });
});
