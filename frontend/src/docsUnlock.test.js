import assert from "node:assert/strict";
import test from "node:test";
import { createTapCounter, DOCS_UNLOCK_KEY, isDocsUnlocked, setDocsUnlocked } from "./docsUnlock.js";

const memoryStorage = () => {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
};

test("seven quick taps unlock", () => {
  let time = 1000;
  const counter = createTapCounter({ now: () => time });
  const results = [];
  for (let i = 0; i < 7; i += 1) { results.push(counter.tap()); time += 300; }
  assert.equal(results.slice(0, 6).every((r) => !r.unlocked), true);
  assert.equal(results[6].unlocked, true);
});

test("a pause longer than the window restarts the count", () => {
  let time = 1000;
  const counter = createTapCounter({ now: () => time });
  for (let i = 0; i < 5; i += 1) { counter.tap(); time += 500; }
  time += 3000;
  assert.equal(counter.tap().count, 1);
});

test("unlock state is stored and can be hidden again", () => {
  const storage = memoryStorage();
  assert.equal(isDocsUnlocked(storage), false);
  setDocsUnlocked(true, storage);
  assert.equal(storage.getItem(DOCS_UNLOCK_KEY), "1");
  assert.equal(isDocsUnlocked(storage), true);
  setDocsUnlocked(false, storage);
  assert.equal(isDocsUnlocked(storage), false);
});