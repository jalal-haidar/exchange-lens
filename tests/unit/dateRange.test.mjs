import test from "node:test";
import assert from "node:assert/strict";

import { getUtcDateRange, getUtcDayRange } from "../../lib/domain/dateRange.js";

test("report dates use the operator device timezone and an exclusive end", () => {
  assert.deepEqual(getUtcDayRange("2026-07-21", "America/New_York"), {
    start: "2026-07-21T04:00:00.000Z",
    endExclusive: "2026-07-22T04:00:00.000Z",
  });

  assert.deepEqual(getUtcDayRange("2026-07-21", "Asia/Karachi"), {
    start: "2026-07-20T19:00:00.000Z",
    endExclusive: "2026-07-21T19:00:00.000Z",
  });
});

test("report ranges include the complete final local day", () => {
  assert.deepEqual(getUtcDateRange("2026-07-20", "2026-07-21", "America/New_York"), {
    start: "2026-07-20T04:00:00.000Z",
    endExclusive: "2026-07-22T04:00:00.000Z",
  });
});
