import { requireAuthUser } from "@/lib/auth/helpers";
import { AppError } from "@/lib/errors";
import { hasPermission } from "./permissions";

function accessError(error, fallback) {
  if (error?.code === "42501") return AppError.forbidden(error.message);
  if (error?.code === "P0002") {
    return new AppError(error.message || "Exchange resource not found", 404, "RES_001");
  }
  if (error?.code === "23505") return AppError.alreadyExists("Exchange organization");
  if (error?.code === "23514" || error?.code === "22023") {
    return AppError.validationFailed(error.message);
  }
  return AppError.databaseError(fallback, error);
}

export async function getExchangeAccessContext(request) {
  const { user, supabase } = await requireAuthUser(request);
  const { data, error } = await supabase.schema("exchange").rpc("get_access_context");
  if (error) throw accessError(error, "Failed to resolve Exchange access");
  return { user, supabase, access: data };
}

export async function requireExchangePermission(request, permission) {
  const context = await getExchangeAccessContext(request);
  if (context.access?.state !== "active") {
    throw AppError.forbidden(
      context.access?.state === "selection_required"
        ? "Organization selection is required"
        : "Exchange organization membership is required",
    );
  }
  const requiredPermissions = Array.isArray(permission) ? permission : [permission];
  if (!requiredPermissions.some((candidate) => hasPermission(context.access, candidate))) {
    throw AppError.forbidden("You do not have permission to perform this action");
  }
  return {
    ...context,
    organizationId: context.access.organization.id,
    role: context.access.role,
    permissions: context.access.permissions,
  };
}

export function throwAccessDatabaseError(error, fallback) {
  throw accessError(error, fallback);
}
