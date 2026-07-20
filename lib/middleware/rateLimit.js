const rateLimitStore = new Map();

export const RateLimitPresets = {
  standard: { windowMs: 60 * 1000, maxRequests: 60 },
  strict: { windowMs: 60 * 1000, maxRequests: 10 },
  lenient: { windowMs: 60 * 1000, maxRequests: 120 },
};

export function rateLimit(preset = RateLimitPresets.standard) {
  const { windowMs, maxRequests } = preset;

  return async function checkRateLimit(request) {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const key = `${ip}:${request.nextUrl?.pathname || "/"}`;
    const now = Date.now();

    const record = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }

    record.count++;
    rateLimitStore.set(key, record);

    if (record.count > maxRequests) {
      const { NextResponse } = await import("next/server");
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((record.resetAt - now) / 1000)) } }
      );
    }

    return null;
  };
}
