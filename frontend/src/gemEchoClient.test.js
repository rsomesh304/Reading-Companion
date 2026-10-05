import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { fetchGemEchoes, gemPairCacheKey, gemPairSignature, gemTextHash } from "./gemEchoClient.js";

function makeStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
}
beforeEach(() => { globalThis.localStorage = makeStorage(); });
afterEach(() => { delete globalThis.localStorage; });

const gems = [
  { id: 1, bookId: "a", bookTitle: "A", quote: "No matter how high you fly, stay grounded." },
  { id: "b", bookId: "b", bookTitle: "B", quote: "Tall trees are held up by roots no one sees." },
];

test("pair cache signatures change when text changes and normalize mixed ID types", () => {
  assert.equal(gemPairCacheKey(1, "b"), gemPairCacheKey("b", "1"));
  assert.notEqual(gemTextHash(gems[0]), gemTextHash({ ...gems[0], quote: "A different line." }));
  assert.notEqual(gemPairSignature(gems[0], gems[1]), gemPairSignature(gems[0], { ...gems[1], quote: "Another quote." }));
});

test("successful AI pair results cache with normalized numeric/string IDs", async () => {
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    return { ok: true, json: async () => ({ status: "ok", pairs: [[1, "b", "Success needs humility", 0.86]] }) };
  };
  const first = await fetchGemEchoes(gems, { fetcher });
  assert.equal(first.length, 1);
  assert.equal(first[0].source, "ai");
  assert.equal(first[0].a, "1");
  await fetchGemEchoes(gems, { fetcher });
  assert.equal(calls, 1);
});

test("editing a quote invalidates its cached pair verdict", async () => {
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    return { ok: true, json: async () => ({ status: "ok", pairs: [[1, "b", "Shared lesson", 0.8]] }) };
  };
  await fetchGemEchoes(gems, { fetcher });
  await fetchGemEchoes([{ ...gems[0], quote: "No matter how successful you become, remember to stay grounded." }, gems[1]], { fetcher });
  assert.equal(calls, 2);
});

test("unavailable responses are never cached and can be retried", async () => {
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    return { ok: false, status: 503, json: async () => ({ status: "unavailable", pairs: [] }) };
  };
  await fetchGemEchoes(gems, { fetcher });
  await fetchGemEchoes(gems, { fetcher });
  assert.equal(calls, 2);
});
