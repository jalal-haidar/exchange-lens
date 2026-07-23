import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission } from "@/lib/access/server";
import { getUtcDateRange } from "@/lib/domain/dateRange";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { subtractMoney } from "@/lib/domain/ledgerInput";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request) => {
  const { supabase } = await requireExchangePermission(request, Permissions.FINANCIAL_REPORTS_READ);
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

  const { data: ledger, error } = await supabase
    .schema("exchange")
    .rpc("get_financial_summary", {
      p_start: range.start,
      p_end: range.endExclusive,
    });
  if (error) {
    console.error("Profit and loss report error", { error });
    return errorResponse("Failed to fetch profit and loss report", 500);
  }

  return successResponse({
    data: {
      period: { startDate, endDate, timezone },
      cashflow: {
        totalBuy: ledger.trades.buy_total_local,
        totalSell: ledger.trades.sell_total_local,
        totalExpenses: ledger.expenses.total_local,
        totalCreditGiven: 0,
        totalCreditReceived: 0,
        netCashMovement: subtractMoney(
          ledger.trades.sell_total_local,
          ledger.trades.buy_total_local,
          ledger.expenses.total_local,
        ),
      },
      profit: {
        realizedFxMargin: ledger.trades.realized_margin_local,
        totalExpenses: ledger.expenses.total_local,
        netProfit: subtractMoney(
          ledger.trades.realized_margin_local,
          ledger.expenses.total_local,
        ),
      },
      balances: ledger.balances,
      customerBalances: ledger.customer_balances,
    },
  });
});
