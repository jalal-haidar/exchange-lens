import { requireAuthUser } from "@/lib/auth/helpers";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { validateUUID } from "@/lib/utils/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request, { params }) => {
  const { id } = await params;
  validateUUID(id, "Transaction ID");

  const { user, supabase } = await requireAuthUser(request);

  const { data, error } = await supabase
    .schema("exchange")
    .from("transactions")
    .select(`
      *,
      customer:customers(id, name, phone, email),
      currency:currencies(id, code, name, symbol),
      reversal:transaction_reversals(id, reason, created_at)
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return errorResponse("Transaction not found", 404);
  }

  return successResponse({ data: { transaction: data } });
});
