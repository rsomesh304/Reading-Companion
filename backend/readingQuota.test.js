import test from "node:test";
import assert from "node:assert/strict";
import {
  isUserId,
  normalizeDailyLimitMinutes,
  normalizeUsageSeconds,
  parseAdminUserIds,
  quotaResponse,
} from "./readingQuota.js";

test("admin ids are trimmed and case-insensitive", () => {
  assert.deepEqual([...parseAdminUserIds(" ABCD, efgh ,, ")], ["abcd", "efgh"]);
});

test("account ids must be UUIDs", () => {
  assert.equal(isUserId("f47ac10b-58cc-4372-a567-0e02b2c3d479"), true);
  assert.equal(isUserId("reader@example.com"), false);
});

test("quota inputs are bounded whole minutes and batched seconds", () => {
  assert.equal(normalizeDailyLimitMinutes(30), 30);
  assert.equal(normalizeDailyLimitMinutes(0), null);
  assert.equal(normalizeDailyLimitMinutes(1.5), null);
  assert.equal(normalizeDailyLimitMinutes(1441), null);
  assert.equal(normalizeUsageSeconds(10), 10);
  assert.equal(normalizeUsageSeconds(61), null);
});

test("quota response clamps remaining time and exposes admin capability", () => {
  assert.deepEqual(quotaResponse({ daily_limit_minutes: 30, used_seconds: 1750 }, true), {
    dailyLimitMinutes: 30,
    usedSeconds: 1750,
    remainingSeconds: 50,
    canManage: true,
  });
  assert.throws(() => quotaResponse({ daily_limit_minutes: 0, used_seconds: 0 }), /invalid_reading_quota/);
});
