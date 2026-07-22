import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission, throwAccessDatabaseError } from "@/lib/access/server";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { successResponse } from "@/lib/utils/response";
import { parsePagination } from "@/lib/utils/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request) => {
  const { supabase, organizationId } = await requireExchangePermission(request, Permissions.AUDIT_READ);
  const { searchParams } = new URL(request.url);
  const { limit, offset, page } = parsePagination(searchParams, { defaultLimit: 30, maxLimit: 100 });
  const { data, error, count } = await supabase.schema("exchange").from("audit_events")
    .select("id,actor_user_id,entity_type,entity_id,action,metadata,created_at", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throwAccessDatabaseError(error, "Failed to load audit events");
  return successResponse({
    events: data,
    pagination: { total: count || 0, limit, offset, page, hasMore: (count || 0) > offset + limit },
  });
});
