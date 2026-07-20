import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";

export function successResponse(data, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function errorResponse(message, status = 500, errors = null) {
  const body = { success: false, error: message };
  if (errors) body.errors = errors;
  return NextResponse.json(body, { status });
}

export function paginatedResponse(data, pagination) {
  return NextResponse.json({ success: true, ...data, pagination }, { status: 200 });
}

export function handleApiError(error) {
  const appError = error instanceof AppError ? AppError.from(error) : AppError.from(error);
  return errorResponse(appError.message, appError.statusCode, appError.details);
}
