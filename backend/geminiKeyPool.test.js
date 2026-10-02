import assert from "node:assert/strict";
import test from "node:test";
import { DailyGeminiKeyPool } from "./geminiKeyPool.js";

test("keeps using the active key until quota exhaustion is reported", () => {
  const pool = new DailyGeminiKeyPool(7);

  assert.equal(pool.currentIndex("2026-10-02"), 0);
  assert.equal(pool.currentIndex("2026-10-02"), 0);
  assert.equal(pool.markExhausted(0, "2026-10-02"), 1);
  assert.equal(pool.currentIndex("2026-10-02"), 1);
});

test("does not skip another key when the same quota failure is reported twice", () => {
  const pool = new DailyGeminiKeyPool(7);

  assert.equal(pool.markExhausted(0, "2026-10-02"), 1);
  assert.equal(pool.markExhausted(0, "2026-10-02"), 1);
});

test("starts from key one on a new device-local day", () => {
  const pool = new DailyGeminiKeyPool(7);

  pool.markExhausted(0, "2026-10-02");
  assert.equal(pool.currentIndex("2026-10-02"), 1);
  assert.equal(pool.currentIndex("2026-10-03"), 0);
});

test("reports no available key after all keys are exhausted for the day", () => {
  const pool = new DailyGeminiKeyPool(2);

  assert.equal(pool.markExhausted(0, "2026-10-02"), 1);
  assert.equal(pool.markExhausted(1, "2026-10-02"), null);
  assert.equal(pool.currentIndex("2026-10-02"), null);
});