import { AppError } from "@/lib/errors";

export function parsePagination(searchParams, { defaultLimit = 20, maxLimit = 50 } = {}) {
  const limit = Math.min(parseInt(searchParams.get("limit") || defaultLimit, 10), maxLimit);
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
  const offset = (page - 1) * limit;
  return { limit, offset, page };
}

export function parseSortBy(searchParams, allowedFields = ["created_at"]) {
  const sortBy = searchParams.get("sort_by") || "created_at";
  const sortDirection = searchParams.get("sort_direction") || "desc";

  if (!allowedFields.includes(sortBy)) {
    throw AppError.validationFailed(`Invalid sort field: ${sortBy}`);
  }

  return { sortBy, sortDirection };
}

export function validateUUID(id, fieldName = "ID") {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !uuidRegex.test(id)) {
    throw AppError.validationFailed(`Invalid ${fieldName} format`);
  }
  return id;
}

export function sanitizeString(str) {
  if (typeof str !== "string") return str;
  return str.trim().replace(/\s+/g, " ");
}

export function parseDateFilter(searchParams) {
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  return { startDate, endDate };
}
