import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission } from "@/lib/access/server";
import { prepareExpenseInput } from "@/lib/domain/expenseInput";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { rateLimit, RateLimitPresets } from "@/lib/middleware";
import { mapLedgerError } from "@/lib/domain/ledgerInput";

const readRateLimiter = rateLimit(RateLimitPresets.standard);
const writeRateLimiter = rateLimit(RateLimitPresets.strict);

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request) => {
  const rateLimitResult = await readRateLimiter(request);
  if (rateLimitResult) return rateLimitResult;

  const { supabase, organizationId } = await requireExchangePermission(request, [Permissions.OPERATIONS_READ_ALL, Permissions.EXPENSES_READ_OWN]);
  const [expensesResult, reversalsResult] = await Promise.all([
    supabase
      .schema("exchange")
      .from("expenses")
      .select("*, category:expense_categories(id, name)")
      .eq("organization_id", organizationId)
      .order("date", { ascending: false })
      .limit(100),
    supabase
      .schema("exchange")
      .from("expense_reversals")
      .select("expense_id")
      .eq("organization_id", organizationId),
  ]);

  if (expensesResult.error || reversalsResult.error) {
    console.error("Expense list error", {
      expenses: expensesResult.error,
      reversals: reversalsResult.error,
    });
    return errorResponse("Failed to fetch expenses", 500);
  }

  const reversedExpenseIds = new Set(
    (reversalsResult.data || []).map((reversal) => reversal.expense_id),
  );
  const expenses = (expensesResult.data || []).filter(
    (expense) => !reversedExpenseIds.has(expense.id),
  );

  return successResponse({ data: { expenses } });
});

export const POST = asyncHandler(async (request) => {
  const rateLimitResult = await writeRateLimiter(request);
  if (rateLimitResult) return rateLimitResult;

  const { supabase, organizationId } = await requireExchangePermission(request, Permissions.EXPENSES_POST);
  const body = await request.json();

  let expenseInput;
  try {
    expenseInput = prepareExpenseInput(body);
  } catch (error) {
    return errorResponse(error.message, 400);
  }

  const { data: postedExpense, error: postError } = await supabase
    .schema("exchange")
    .rpc("post_ledger_expense", expenseInput)
    .single();

  if (postError) {
    const mapped = mapLedgerError(postError);
    if (mapped.status === 500) {
      console.error("Expense posting failed", {
        code: postError.code,
        details: postError.details,
      });
    }
    return errorResponse(mapped.message, mapped.status);
  }

  const { data: hydratedExpense, error: hydrateError } = await supabase
    .schema("exchange")
    .from("expenses")
    .select("*, category:expense_categories(id, name)")
    .eq("id", postedExpense.id)
    .eq("organization_id", organizationId)
    .single();

  if (hydrateError) {
    console.error("Expense hydration failed", {
      expenseId: postedExpense.id,
      code: hydrateError.code,
    });
  }

  return successResponse({
    data: { expense: hydratedExpense || postedExpense },
  }, 201);
});
