import { requireAuthUser } from "@/lib/auth/helpers";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { TRANSACTION_TYPES } from "@/lib/shared/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request) => {
  const { user, supabase } = await requireAuthUser(request);
  const { searchParams } = new URL(request.url);

  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  let query = supabase
    .schema("exchange")
    .from("transactions")
    .select("type, amount_local, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);

  const { data: transactions, error } = await query;

  if (error) {
    return errorResponse("Failed to fetch P&L report", 500);
  }

  let totalBuy = 0;
  let totalSell = 0;
  let totalExpenses = 0;
  let totalCreditGiven = 0;
  let totalCreditReceived = 0;

  transactions.forEach((t) => {
    const amount = Number(t.amount_local);
    switch (t.type) {
      case TRANSACTION_TYPES.BUY: totalBuy += amount; break;
      case TRANSACTION_TYPES.SELL: totalSell += amount; break;
      case TRANSACTION_TYPES.EXPENSE: totalExpenses += amount; break;
      case TRANSACTION_TYPES.CREDIT_GIVEN: totalCreditGiven += amount; break;
      case TRANSACTION_TYPES.CREDIT_RECEIVED: totalCreditReceived += amount; break;
    }
  });

  const grossProfit = totalSell - totalBuy;
  const netProfit = grossProfit - totalExpenses;

  return successResponse({
    data: {
      period: { startDate: startDate || "all", endDate: endDate || "all" },
      revenue: {
        totalSell,
        totalBuy,
        grossProfit,
      },
      expenses: {
        totalExpenses,
      },
      credits: {
        totalCreditGiven,
        totalCreditReceived,
        netCredits: totalCreditReceived - totalCreditGiven,
      },
      netProfit,
    },
  });
});
