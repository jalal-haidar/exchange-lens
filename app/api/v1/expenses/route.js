import { requireAuthUser } from "@/lib/auth/helpers";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { rateLimit, RateLimitPresets } from "@/lib/middleware";

const readRateLimiter = rateLimit(RateLimitPresets.standard);
const writeRateLimiter = rateLimit(RateLimitPresets.strict);

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request) => {
  const rateLimitResult = await readRateLimiter(request);
  if (rateLimitResult) return rateLimitResult;

  const { user, supabase } = await requireAuthUser(request);

  const { data, error } = await supabase
    .schema("exchange")
    .from("expenses")
    .select(`
      *,
      category:expense_categories(id, name)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    // If expenses table doesn't exist yet, return empty
    return successResponse({ data: { expenses: [] } });
  }

  return successResponse({ data: { expenses: data || [] } });
});

export const POST = asyncHandler(async (request) => {
  const rateLimitResult = await writeRateLimiter(request);
  if (rateLimitResult) return rateLimitResult;

  const { user, supabase } = await requireAuthUser(request);
  const body = await request.json();

  if (!body.amount || Number(body.amount) <= 0) {
    return errorResponse("Amount is required and must be positive", 400);
  }

  const expenseData = {
    user_id: user.id,
    category_id: body.category_id || null,
    amount: Number(body.amount),
    description: body.description || null,
    date: body.date || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .schema("exchange")
    .from("expenses")
    .insert(expenseData)
    .select()
    .single();

  if (error) {
    return errorResponse("Failed to create expense", 500);
  }

  return successResponse({ data: { expense: data } }, 201);
});
