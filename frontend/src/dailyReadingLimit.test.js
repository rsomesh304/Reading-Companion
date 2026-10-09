import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DAILY_READING_LIMIT_SECONDS,
  DAILY_READING_USAGE_KEY,
  getDailyReadingRemaining,
  getDailyReadingUsage,
  recordDailyReadingSeconds,
} from "./dailyReadingLimit.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("daily reading limit aggregates sessions and never records beyond the cap", () => {
  const storage = memoryStorage();
  const date = new Date(2026, 9, 6, 12);
  storage.setItem(DAILY_READING_USAGE_KEY, JSON.stringify({ "2026-10-06": DAILY_READING_LIMIT_SECONDS - 1 }));

  assert.deepEqual(recordDailyReadingSeconds(storage, 1, date), { usedSeconds: DAILY_READING_LIMIT_SECONDS, remainingSeconds: 0 });
  assert.equal(recordDailyReadingSeconds(storage, 15, date).usedSeconds, DAILY_READING_LIMIT_SECONDS);
  assert.equal(getDailyReadingUsage(storage, date), DAILY_READING_LIMIT_SECONDS);
  assert.equal(getDailyReadingRemaining(storage, date), 0);
});

test("daily reading allowance resets on the next local calendar day", () => {
  const storage = memoryStorage();
  const priorDay = new Date(2026, 9, 6, 23, 59);
  const nextDay = new Date(2026, 9, 7, 0, 1);
  recordDailyReadingSeconds(storage, 1, priorDay);

  assert.equal(getDailyReadingUsage(storage, nextDay), 0);
  assert.equal(getDailyReadingRemaining(storage, nextDay), DAILY_READING_LIMIT_SECONDS);
});
