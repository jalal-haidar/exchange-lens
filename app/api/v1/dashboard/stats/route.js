import { requireAuthUser } from "@/lib/auth/helpers";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { rateLimit, RateLimitPresets } from "@/lib/middleware";
import { TRANSACTION_TYPES } from "@/lib/shared/constants";

const readRateLimiter = rateLimit(RateLimitPresets.standard);

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request) => {
  const rateLimitResult = await readRateLimiter(request);
  if (rateLimitResult) return rateLimitResult;

  const { user, supabase } = await requireAuthUser(request);
  const { searchParams } = new URL(request.url);

  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const startDate = `${date}T00:00:00.000Z`;
  const endDate = `${date}T23:59:59.999Z`;

  // Get today's transactions
  const { data: transactions, error: txError } = await supabase
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

  if (txError) {
    console.error("Dashboard stats TX error:", txError);
    return errorResponse(`Failed to fetch dashboard stats: ${txError.message}`, 500);
  }

  // Calculate stats
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

  const profit = totalSell - totalBuy - totalExpenses;

  // Get total customers count
  const { count: totalCustomers } = await supabase
    .schema("exchange")
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Get pending credits
  const { data: creditTransactions } = await supabase
    .schema("exchange")
    .from("transactions")
    .select("type, amount_local")
    .eq("user_id", user.id)
    .in("type", [TRANSACTION_TYPES.CREDIT_GIVEN, TRANSACTION_TYPES.CREDIT_RECEIVED]);

  let totalOwed = 0;
  let totalPaid = 0;
  creditTransactions?.forEach((t) => {
    if (t.type === TRANSACTION_TYPES.CREDIT_GIVEN) totalOwed += Number(t.amount_local);
    if (t.type === TRANSACTION_TYPES.CREDIT_RECEIVED) totalPaid += Number(t.amount_local);
  });

  return successResponse({
    data: {
      stats: {
        totalBuy,
        totalSell,
        totalExpenses,
        totalCreditGiven,
        totalCreditReceived,
        profit,
        totalCustomers: totalCustomers || 0,
        pendingCredits: totalOwed - totalPaid,
        transactionCount: transactions.length,
      },
      recentTransactions: transactions.slice(0, 10),
    },
  });
});
