import assert from "node:assert/strict";
import test from "node:test";
import { classifyGeminiFailure, KeyPool, nextQuotaResetAt } from "./geminiKeyPool.js";

const ids = (() => { let id = 0; return () => `lease-${++id}`; })();

test("spreads 20 concurrent leases across seven keys and respects each cap", async () => {
  const pool = new KeyPool(7, { makeId: ids });
  const leases = await Promise.all(Array.from({ length: 20 }, () => pool.acquireLease({ timeoutMs: 0 })));
  assert.ok(leases.every((lease) => !lease.unavailable));
  const counts = pool.status().map((key) => key.activeLeases);
  assert.deepEqual(counts, [3, 3, 3, 3, 3, 3, 2]);
  assert.ok(Math.max(...counts) <= 3);
  leases.forEach((lease) => pool.releaseLease(lease.leaseId));
  pool.close();
});

test("REST key selection spreads same-millisecond requests by least-recently-used", () => {
  const pool = new KeyPool(7, { now: () => 1000 });
  const counts = Array.from({ length: 20 }, () => pool.selectKey()).reduce((result, index) => {
    result[index] += 1;
    return result;
  }, Array(7).fill(0));
  assert.deepEqual(counts, [3, 3, 3, 3, 3, 3, 2]);
  pool.close();
});

test("rate limit cooldown uses exponential backoff with bounded jitter and success resets it", () => {
  let now = 1_000;
  const pool = new KeyPool(1, { now: () => now, random: () => 0.5 });
  assert.equal(pool.reportFailure(0, { code: "rate_limit_exceeded", status: 429 }), "rate_limit_minute");
  const first = pool.status()[0].cooldownSeconds;
  assert.ok(first >= 30 && first <= 45);
  now += 50_000;
  assert.equal(pool.reportFailure(0, { code: "rate_limit_exceeded", status: 429 }), "rate_limit_minute");
  const second = pool.status()[0].cooldownSeconds;
  assert.ok(second > first && second <= 60);
  assert.equal(pool.reportSuccess(0), true);
  assert.equal(pool.status()[0].state, "healthy");
  assert.equal(pool.status()[0].consecutiveFailures, 0);
  pool.close();
});

test("daily quota cools until midnight in the configured timezone", () => {
  const now = Date.parse("2026-10-04T20:00:00Z");
  const next = nextQuotaResetAt(now, "America/Los_Angeles");
  assert.equal(new Date(next).toISOString(), "2026-10-05T07:00:00.000Z");
  const pool = new KeyPool(1, { now: () => now, quotaResetTz: "America/Los_Angeles" });
  pool.reportFailure(0, { code: "quota_exceeded", status: 429 });
  assert.equal(pool.status()[0].state, "cooling");
  assert.equal(pool.status()[0].cooldownSeconds, Math.ceil((next - now) / 1000));
  pool.close();
});

test("shared classifier separates structured per-day quota metadata from per-minute exhaustion", () => {
  assert.equal(classifyGeminiFailure({ status: 429, message: "RESOURCE_EXHAUSTED", details: [{ metadata: { quotaId: "GenerateRequestsPerDayPerProjectPerModel" } }] }), "quota_daily");
  assert.equal(classifyGeminiFailure({ status: 429, message: "RESOURCE_EXHAUSTED: requests per minute exceeded" }), "rate_limit_minute");
});

test("authentication and billing failures disable a key for one hour", () => {
  let now = 1_000;
  const pool = new KeyPool(1, { now: () => now });
  pool.reportFailure(0, { code: "permission_denied", status: 403 });
  assert.equal(pool.status()[0].state, "disabled");
  assert.equal(pool.status()[0].cooldownSeconds, 3600);
  now += 60 * 60 * 1000 + 1;
  assert.equal(pool.status()[0].state, "healthy");
  pool.close();
});

test("silent and transient reports are counted but never penalize a key", () => {
  const pool = new KeyPool(1);
  assert.equal(classifyGeminiFailure({ message: "no_reply connected but silent" }), "silent");
  assert.equal(pool.reportFailure(0, { message: "no_reply connected but silent" }), "silent");
  assert.equal(pool.reportFailure(0, { message: "socket hang up", code: 1006 }), "transient");
  const status = pool.status()[0];
  assert.equal(status.state, "healthy");
  assert.equal(status.cooldownSeconds, 0);
  assert.equal(status.consecutiveFailures, 0);
  assert.equal(status.failures.silent, 1);
  assert.equal(status.failures.transient, 1);
  pool.close();
});

test("release is idempotent and expired leases decrement active counts", async () => {
  let now = 0;
  const pool = new KeyPool(1, { now: () => now, makeId: ids, leaseTtlMs: 1000 });
  const lease = await pool.acquireLease({ timeoutMs: 0 });
  assert.equal(pool.status()[0].activeLeases, 1);
  assert.equal(pool.releaseLease(lease.leaseId), true);
  assert.equal(pool.releaseLease(lease.leaseId), false);
  const expiring = await pool.acquireLease({ timeoutMs: 0 });
  now = 1001;
  pool.expireLeases();
  assert.equal(pool.getLease(expiring.leaseId), null);
  assert.equal(pool.status()[0].activeLeases, 0);
  pool.close();
});

test("all cooling or capacity-limited keys return retry metadata", async () => {
  const pool = new KeyPool(1, { waitTimeoutMs: 0 });
  pool.reportFailure(0, { code: "quota_exceeded", status: 429 });
  const result = await pool.acquireLease({ timeoutMs: 0 });
  assert.equal(result.unavailable, true);
  assert.ok(result.retryAfterSec >= 1);
  pool.close();
});
