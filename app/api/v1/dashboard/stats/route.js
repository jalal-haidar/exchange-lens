import { Permissions, hasPermission } from "@/lib/access/permissions";
import { requireExchangePermission } from "@/lib/access/server";
import {
  calculateCustomerOutstanding,
  summarizeCashflow,
  summarizeProfitLoss,
} from "@/lib/domain/accounting";
import { getUtcDayRange } from "@/lib/domain/dateRange";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { rateLimit, RateLimitPresets } from "@/lib/middleware";
import { TRANSACTION_TYPES } from "@/lib/shared/constants";
import { inSentrySpan, markSpanError } from "@/lib/observability/server-tracing";

const readRateLimiter = rateLimit(RateLimitPresets.standard);

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isActive(entry) {
  return !entry.reversal || (Array.isArray(entry.reversal) && entry.reversal.length === 0);
}

export const GET = asyncHandler(async (request) => {
  return inSentrySpan("api.dashboard.stats", async (span) => {
    const rateLimitResult = await readRateLimiter(request);
    if (rateLimitResult) return rateLimitResult;

    const { supabase, organizationId, access } = await inSentrySpan(
      "api.dashboard.stats.auth",
      () => requireExchangePermission(request, Permissions.ACCESS_READ),
      { parent: span },
    );
    span.setAttribute("organization_id", organizationId);

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const timezone = searchParams.get("timezone") || "UTC";
    if (!date) return errorResponse("Date is required", 400);

    let range;
    try {
      range = getUtcDayRange(date, timezone);
    } catch (error) {
      return errorResponse(error.message, 400);
    }

    const [transactionsResult, expensesResult, customersResult, creditsResult] = await inSentrySpan(
      "api.dashboard.stats.query",
      () => Promise.all([
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
        supabase
          .schema("exchange")
          .from("customers")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("is_active", true),
        supabase
          .schema("exchange")
          .from("transactions")
          .select("type, amount_local, reversal:transaction_reversals(id)")
          .eq("organization_id", organizationId)
          .in("type", [TRANSACTION_TYPES.CREDIT_GIVEN, TRANSACTION_TYPES.CREDIT_RECEIVED]),
      ]),
      { parent: span },
    );

    const queryError = transactionsResult.error
      || expensesResult.error
      || customersResult.error
      || creditsResult.error;
    if (queryError) {
      console.error("Dashboard stats error", queryError);
      markSpanError(span, queryError);
      return errorResponse("Failed to fetch dashboard stats", 500);
    }

    const transactions = (transactionsResult.data || []).filter(isActive);
    const expenses = (expensesResult.data || []).filter(isActive);
    const credits = (creditsResult.data || []).filter(isActive);
    const cashflow = summarizeCashflow({ transactions, expenses });
    const canReadProfit = hasPermission(access, Permissions.FINANCIAL_REPORTS_READ);
    const profit = canReadProfit ? summarizeProfitLoss({ transactions, expenses }) : null;
    return successResponse({
      data: {
        stats: {
          totalBuy: cashflow.total_buy,
          totalSell: cashflow.total_sell,
          totalExpenses: cashflow.total_expenses,
          totalCreditGiven: cashflow.total_credit_given,
          totalCreditReceived: cashflow.total_credit_received,
          netCashMovement: cashflow.net_cash_movement,
          ...(profit ? { realizedProfit: profit.net_profit } : {}),
          totalCustomers: customersResult.count || 0,
          pendingCredits: calculateCustomerOutstanding(credits),
          transactionCount: transactions.length,
        },
        recentTransactions: transactions.slice(0, 10),
      },
    });
  });
});
