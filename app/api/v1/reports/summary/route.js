import { requireAuthUser } from "@/lib/auth/helpers";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { TRANSACTION_TYPES } from "@/lib/shared/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request) => {
  const { user, supabase } = await requireAuthUser(request);
  const { searchParams } = new URL(request.url);

  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const startDate = `${date}T00:00:00.000Z`;
  const endDate = `${date}T23:59:59.999Z`;

  const { data: transactions, error } = await supabase
    .schema("exchange")
    .from("transactions")
    .select(`
      *,
      customer:customers(id, name),
      currency:currencies(id, code, symbol)
    `)
    .eq("user_id", user.id)
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: false });

  if (error) {
    return errorResponse("Failed to fetch summary", 500);
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

  return successResponse({
    data: {
      date,
      summary: {
        totalBuy,
        totalSell,
        totalExpenses,
        totalCreditGiven,
        totalCreditReceived,
        profit: totalSell - totalBuy - totalExpenses,
      },
      transactions,
    },
  });
});
