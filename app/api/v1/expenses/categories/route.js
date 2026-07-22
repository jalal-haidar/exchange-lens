import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission } from "@/lib/access/server";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request) => {
  const { supabase, organizationId } = await requireExchangePermission(request, Permissions.EXPENSES_POST);

  const { data, error } = await supabase
    .schema("exchange")
    .from("expense_categories")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Expense category list error", { code: error.code, details: error.details });
    return errorResponse("Failed to fetch expense categories", 500);
  }

  return successResponse({ data: { categories: data || [] } });
});

export const POST = asyncHandler(async (request) => {
  const { user, supabase, organizationId } = await requireExchangePermission(request, Permissions.EXPENSES_POST);
  const body = await request.json();

  if (!body.name?.trim()) {
    return errorResponse("Category name is required", 400);
  }

  const { data, error } = await supabase
    .schema("exchange")
    .from("expense_categories")
    .insert({ user_id: user.id, organization_id: organizationId, created_by: user.id, name: body.name.trim() })
    .select()
    .single();

  if (error) {
    return errorResponse("Failed to create category", 500);
  }

  return successResponse({ data: { category: data } }, 201);
});
