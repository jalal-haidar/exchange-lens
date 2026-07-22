import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/helpers";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { parsePagination, sanitizeString } from "@/lib/utils/validation";
import { rateLimit, RateLimitPresets } from "@/lib/middleware";

const readRateLimiter = rateLimit(RateLimitPresets.standard);
const writeRateLimiter = rateLimit(RateLimitPresets.strict);

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request) => {
  const rateLimitResult = await readRateLimiter(request);
  if (rateLimitResult) return rateLimitResult;

  const { user, supabase } = await requireAuthUser(request);
  const { searchParams } = new URL(request.url);
  const { limit, offset } = parsePagination(searchParams, { defaultLimit: 20, maxLimit: 50 });

  const search = searchParams.get("search") || "";
  const isActive = searchParams.get("is_active");

  let query = supabase
    .schema("exchange")
    .from("customers")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
  }

  // Normal customer workflows should not surface deactivated records. Historical
  // callers can still explicitly request them with ?is_active=false.
  query = query.eq("is_active", isActive === null ? true : isActive === "true");

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    return errorResponse("Failed to fetch customers", 500);
  }

  return successResponse({
    data: { customers: data },
    pagination: { total: count || 0, limit, offset, page: Math.floor(offset / limit) + 1, hasMore: (count || 0) > offset + limit },
  });
});

export const POST = asyncHandler(async (request) => {
  const rateLimitResult = await writeRateLimiter(request);
  if (rateLimitResult) return rateLimitResult;

  const { user, supabase } = await requireAuthUser(request);
  const body = await request.json();

  if (!body.name?.trim()) {
    return errorResponse("Customer name is required", 400);
  }

  const customerData = {
    user_id: user.id,
    name: sanitizeString(body.name),
    phone: body.phone || null,
    email: body.email || null,
    address: body.address || null,
    notes: body.notes || null,
    is_active: body.is_active !== false,
  };

  const { data, error } = await supabase
    .schema("exchange")
    .from("customers")
    .insert(customerData)
    .select()
    .single();

  if (error) {
    return errorResponse("Failed to create customer", 500);
  }

  return successResponse({ data: { customer: data } }, 201);
});
