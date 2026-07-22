import { Permissions, hasPermission } from "@/lib/access/permissions";
import { requireExchangePermission } from "@/lib/access/server";
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

  const { supabase, organizationId, access } = await requireExchangePermission(request, Permissions.CUSTOMERS_DIRECTORY_READ);
  const { searchParams } = new URL(request.url);
  const { limit, offset } = parsePagination(searchParams, { defaultLimit: 20, maxLimit: 50 });

  const search = searchParams.get("search") || "";
  const isActive = searchParams.get("is_active");

  if (!hasPermission(access, Permissions.CUSTOMERS_READ)) {
    const { data, error } = await supabase.schema("exchange").rpc("get_customer_directory");
    if (error) return errorResponse("Failed to fetch customers", 500);
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = (data || []).filter((customer) => {
      const matchesActive = isActive === null ? customer.is_active : customer.is_active === (isActive === "true");
      const matchesSearch = !normalizedSearch
        || customer.name?.toLowerCase().includes(normalizedSearch)
        || customer.phone?.toLowerCase().includes(normalizedSearch);
      return matchesActive && matchesSearch;
    });
    return successResponse({
      data: { customers: filtered.slice(offset, offset + limit), directoryRestricted: true },
      pagination: { total: filtered.length, limit, offset, page: Math.floor(offset / limit) + 1, hasMore: filtered.length > offset + limit },
    });
  }

  let query = supabase
    .schema("exchange")
    .from("customers")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
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

  const { user, supabase, organizationId } = await requireExchangePermission(request, Permissions.CUSTOMERS_MANAGE);
  const body = await request.json();

  if (!body.name?.trim()) {
    return errorResponse("Customer name is required", 400);
  }

  const customerData = {
    user_id: user.id,
    organization_id: organizationId,
    created_by: user.id,
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
