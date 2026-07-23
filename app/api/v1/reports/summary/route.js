import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission } from "@/lib/access/server";
import { getUtcDayRange } from "@/lib/domain/dateRange";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { subtractMoney } from "@/lib/domain/ledgerInput";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  const [summaryResult, transactionsResult] = await Promise.all([
    supabase
      .schema("exchange")
      .rpc("get_financial_summary", {
        p_start: range.start,
        p_end: range.endExclusive,
      }),
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
      .order("posted_at", { ascending: false })
      .limit(200),
  ]);

  if (summaryResult.error || transactionsResult.error) {
    console.error("Daily summary error", {
      summary: summaryResult.error,
      transactions: transactionsResult.error,
    });
    return errorResponse("Failed to fetch summary", 500);
  }

  const ledger = summaryResult.data;
  const transactions = (transactionsResult.data || []).filter(
    (entry) => !entry.reversal || entry.reversal.length === 0,
  );

  return successResponse({
    data: {
      date,
      timezone,
      summary: {
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
        realizedFxMargin: ledger.trades.realized_margin_local,
        realizedProfit: subtractMoney(
          ledger.trades.realized_margin_local,
          ledger.expenses.total_local,
        ),
        outstanding: ledger.trades.outstanding_local,
        accountBalances: ledger.balances,
      },
      transactions,
      transactionsTruncated: ledger.trades.count > transactions.length,
    },
  });
});
