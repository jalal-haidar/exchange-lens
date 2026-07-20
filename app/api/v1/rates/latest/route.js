import { requireAuthUser } from "@/lib/auth/helpers";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request) => {
  const { user, supabase } = await requireAuthUser(request);

  // Get latest rate for each currency
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
    return errorResponse("Failed to fetch latest rates", 500);
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
