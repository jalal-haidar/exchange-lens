import assert from "node:assert/strict";
import test from "node:test";

import {
  rateLimit,
  RateLimitPresets,
} from "../../lib/middleware/rateLimit.js";

function requestFor(ip, pathname, method = "GET") {
  return {
    headers: new Headers({ "x-real-ip": ip }),
    method,
    nextUrl: { pathname },
  };
}

test("read traffic does not consume the stricter write budget", async () => {
  const ip = `read-write-${crypto.randomUUID()}`;
  const pathname = "/api/v1/customers";
  const readLimiter = rateLimit(RateLimitPresets.standard);
  const writeLimiter = rateLimit(RateLimitPresets.strict);

  for (let index = 0; index < 11; index += 1) {
    assert.equal(await readLimiter(requestFor(ip, pathname)), null);
  }

  assert.equal(
    await writeLimiter(requestFor(ip, pathname, "POST")),
    null,
  );
});

test("a limiter still rejects requests above its own preset", async () => {
  const ip = `strict-${crypto.randomUUID()}`;
  const pathname = "/api/v1/transactions";
  const limiter = rateLimit(RateLimitPresets.strict);

  for (let index = 0; index < RateLimitPresets.strict.maxRequests; index += 1) {
    assert.equal(await limiter(requestFor(ip, pathname, "POST")), null);
  }

  const response = await limiter(requestFor(ip, pathname, "POST"));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
});
