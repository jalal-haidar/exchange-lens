import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/helpers";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { validateUUID, sanitizeString } from "@/lib/utils/validation";
import { rateLimit, RateLimitPresets } from "@/lib/middleware";

const writeRateLimiter = rateLimit(RateLimitPresets.strict);

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request, { params }) => {
  const { id } = await params;
  validateUUID(id, "Customer ID");

  const { user, supabase } = await requireAuthUser(request);

  const { data, error } = await supabase
    .schema("exchange")
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return errorResponse("Customer not found", 404);
  }

  return successResponse({ data: { customer: data } });
});

export const PUT = asyncHandler(async (request, { params }) => {
  const rateLimitResult = await writeRateLimiter(request);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await params;
  validateUUID(id, "Customer ID");

  const { user, supabase } = await requireAuthUser(request);
  const body = await request.json();

  const ALLOWED_COLUMNS = new Set(["name", "phone", "email", "address", "notes", "is_active"]);
  const updateData = {};

  for (const key of Object.keys(body)) {
    if (ALLOWED_COLUMNS.has(key)) {
      updateData[key] = key === "name" ? sanitizeString(body[key]) : body[key];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse("No valid fields to update", 400);
  }

  const { data, error } = await supabase
    .schema("exchange")
    .from("customers")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return errorResponse("Failed to update customer", 500);
  }

  return successResponse({ data: { customer: data } });
});

export const DELETE = asyncHandler(async (request, { params }) => {
  const rateLimitResult = await writeRateLimiter(request);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await params;
  validateUUID(id, "Customer ID");

  const { user, supabase } = await requireAuthUser(request);

  const { error } = await supabase
    .schema("exchange")
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return errorResponse("Failed to delete customer", 500);
  }

  return successResponse({ data: { message: "Customer deleted" } });
});
