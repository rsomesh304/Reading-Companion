import assert from "node:assert/strict";
import test from "node:test";
import { collectSessionStarts, computeStudyPattern } from "./pushNotifications.js";

const now = new Date(2026, 9, 20, 12, 0);
const at = (daysAgo, hour, minute) => new Date(2026, 9, 20 - daysAgo, hour, minute).toISOString();

test("computeStudyPattern needs enough recent sessions", () => {
  assert.equal(computeStudyPattern([], now), null);
  assert.equal(computeStudyPattern([at(1, 20, 0), at(2, 20, 10)], now), null);
  assert.equal(computeStudyPattern([at(60, 20, 0), at(61, 20, 0), at(62, 20, 0)], now), null);
});

test("computeStudyPattern needs a repeated hour", () => {
  assert.equal(computeStudyPattern([at(1, 8, 0), at(2, 13, 0), at(3, 21, 0)], now), null);
});

test("computeStudyPattern picks the busiest hour and reminds 15 minutes early", () => {
  const pattern = computeStudyPattern([at(1, 20, 40), at(2, 20, 30), at(3, 20, 50), at(4, 7, 5), at(5, 7, 10)], now);
  assert.deepEqual(pattern, { typicalMinute: 20 * 60 + 40, reminderMinute: 20 * 60 + 25, sessions: 3, sampleSize: 5 });
});

test("computeStudyPattern wraps reminders before midnight", () => {
  const pattern = computeStudyPattern([at(1, 0, 5), at(2, 0, 10), at(3, 0, 0)], now);
  assert.equal(pattern.reminderMinute, 23 * 60 + 50);
});

test("collectSessionStarts flattens every book's sessions", () => {
  const library = { data: { books: { a: { sessions: [{ startedAt: "x" }, {}] }, b: {} } } };
  assert.deepEqual(collectSessionStarts(library), ["x"]);
});
