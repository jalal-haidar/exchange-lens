import { AppError } from "@/lib/errors";

export function asyncHandler(handler, { timeout = 15000 } = {}) {
  return async function (request, context) {
    try {
      const result = await Promise.race([
        handler(request, context),
        new Promise((_, reject) =>
          setTimeout(() => reject(AppError.internal("Request timeout")), timeout)
        ),
      ]);
      return result;
    } catch (error) {
      const appError = error instanceof AppError ? error : AppError.from(error);
      const { NextResponse } = await import("next/server");
      return NextResponse.json(
        { success: false, error: appError.message, code: appError.code },
        { status: appError.statusCode }
      );
    }
  };
}
