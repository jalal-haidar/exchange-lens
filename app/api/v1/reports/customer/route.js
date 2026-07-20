import { requireAuthUser } from "@/lib/auth/helpers";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { validateUUID } from "@/lib/utils/validation";
import { TRANSACTION_TYPES } from "@/lib/shared/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request) => {
  const { user, supabase } = await requireAuthUser(request);
  const { searchParams } = new URL(request.url);

  const customerId = searchParams.get("customer_id");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  if (!customerId) return errorResponse("Customer ID is required", 400);
  validateUUID(customerId, "Customer ID");

  let query = supabase
    .schema("exchange")
    .from("transactions")
    .select(`
      *,
      customer:customers(id, name, phone),
      currency:currencies(id, code, symbol)
    `)
    .eq("user_id", user.id)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true });

  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);

  const { data: transactions, error } = await query;

  if (error) {
    return errorResponse("Failed to fetch customer statement", 500);
  }

  // Calculate running balance
  let balance = 0;
  const statement = transactions.map((t) => {
    if (t.type === TRANSACTION_TYPES.SELL || t.type === TRANSACTION_TYPES.CREDIT_GIVEN) {
      balance -= Number(t.amount_local);
    } else if (t.type === TRANSACTION_TYPES.BUY || t.type === TRANSACTION_TYPES.CREDIT_RECEIVED) {
      balance += Number(t.amount_local);
    }
    return { ...t, running_balance: balance };
  });

  // Get customer info
  const { data: customer } = await supabase
    .schema("exchange")
    .from("customers")
    .select("id, name, phone, email")
    .eq("id", customerId)
    .single();

  return successResponse({
    data: {
      customer,
      statement,
      summary: {
        totalTransactions: transactions.length,
        finalBalance: balance,
      },
    },
  });
});
