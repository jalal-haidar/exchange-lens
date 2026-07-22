import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission } from "@/lib/access/server";
import { summarizeCashflow, summarizeProfitLoss } from "@/lib/domain/accounting";
import { getUtcDayRange } from "@/lib/domain/dateRange";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isActive(entry) {
  return !entry.reversal || (Array.isArray(entry.reversal) && entry.reversal.length === 0);
}

export const GET = asyncHandler(async (request) => {
  const { supabase, organizationId } = await requireExchangePermission(request, Permissions.FINANCIAL_REPORTS_READ);
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const timezone = searchParams.get("timezone") || "UTC";

  if (!date) {
    return errorResponse("Date is required", 400);
  }

  let range;
  try {
    range = getUtcDayRange(date, timezone);
  } catch (error) {
    return errorResponse(error.message, 400);
  }

  const [transactionsResult, expensesResult] = await Promise.all([
    supabase
      .schema("exchange")
      .from("transactions")
      .select(`
        *,
        customer:customers(id, name),
        currency:currencies(id, code, symbol),
        reversal:transaction_reversals(id)
      `)
      .eq("organization_id", organizationId)
      .gte("posted_at", range.start)
      .lt("posted_at", range.endExclusive)
      .order("posted_at", { ascending: false }),
    supabase
      .schema("exchange")
      .from("expenses")
      .select("amount, date, reversal:expense_reversals(id)")
      .eq("organization_id", organizationId)
      .gte("date", range.start)
      .lt("date", range.endExclusive),
  ]);

  if (transactionsResult.error || expensesResult.error) {
    console.error("Daily summary error", {
      transactions: transactionsResult.error,
      expenses: expensesResult.error,
    });
    return errorResponse("Failed to fetch summary", 500);
  }

  const transactions = (transactionsResult.data || []).filter(isActive);
  const expenses = (expensesResult.data || []).filter(isActive);
  const cashflow = summarizeCashflow({ transactions, expenses });
  const profit = summarizeProfitLoss({ transactions, expenses });

  return successResponse({
    data: {
      date,
      timezone,
      summary: {
        totalBuy: cashflow.total_buy,
        totalSell: cashflow.total_sell,
        totalExpenses: cashflow.total_expenses,
        totalCreditGiven: cashflow.total_credit_given,
        totalCreditReceived: cashflow.total_credit_received,
        netCashMovement: cashflow.net_cash_movement,
        realizedFxMargin: profit.realized_fx_margin,
        realizedProfit: profit.net_profit,
      },
      transactions,
    },
  });
});
