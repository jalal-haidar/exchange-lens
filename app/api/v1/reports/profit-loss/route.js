import { requireAuthUser } from "@/lib/auth/helpers";
import { summarizeCashflow, summarizeProfitLoss } from "@/lib/domain/accounting";
import { getUtcDateRange } from "@/lib/domain/dateRange";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isActive(entry) {
  return !entry.reversal || (Array.isArray(entry.reversal) && entry.reversal.length === 0);
}

export const GET = asyncHandler(async (request) => {
  const { user, supabase } = await requireAuthUser(request);
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date") || startDate;
  const timezone = searchParams.get("timezone") || "UTC";

  if (!startDate || !endDate) {
    return errorResponse("Start date and end date are required", 400);
  }

  let range;
  try {
    range = getUtcDateRange(startDate, endDate, timezone);
  } catch (error) {
    return errorResponse(error.message, 400);
  }

  const [transactionsResult, expensesResult] = await Promise.all([
    supabase
      .schema("exchange")
      .from("transactions")
      .select("type, amount_local, realized_margin_local, posted_at, reversal:transaction_reversals(id)")
      .eq("user_id", user.id)
      .gte("posted_at", range.start)
      .lt("posted_at", range.endExclusive),
    supabase
      .schema("exchange")
      .from("expenses")
      .select("amount, date, reversal:expense_reversals(id)")
      .eq("user_id", user.id)
      .gte("date", range.start)
      .lt("date", range.endExclusive),
  ]);

  if (transactionsResult.error || expensesResult.error) {
    console.error("Profit and loss report error", {
      transactions: transactionsResult.error,
      expenses: expensesResult.error,
    });
    return errorResponse("Failed to fetch profit and loss report", 500);
  }

  const transactions = (transactionsResult.data || []).filter(isActive);
  const expenses = (expensesResult.data || []).filter(isActive);
  const cashflow = summarizeCashflow({ transactions, expenses });
  const profit = summarizeProfitLoss({ transactions, expenses });

  return successResponse({
    data: {
      period: { startDate, endDate, timezone },
      cashflow: {
        totalBuy: cashflow.total_buy,
        totalSell: cashflow.total_sell,
        totalExpenses: cashflow.total_expenses,
        totalCreditGiven: cashflow.total_credit_given,
        totalCreditReceived: cashflow.total_credit_received,
        netCashMovement: cashflow.net_cash_movement,
      },
      profit: {
        realizedFxMargin: profit.realized_fx_margin,
        totalExpenses: profit.total_expenses,
        netProfit: profit.net_profit,
      },
    },
  });
});
