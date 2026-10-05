import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGemEchoCatalog, validateGemEchoCandidates, validateGemEchoPairs } from "./gemEchoes.js";

test("validates candidate pairs across books and preserves original numeric/string ID types", () => {
  const { catalog, byId } = normalizeGemEchoCatalog([
    { id: 12, bookId: "a", bookTitle: "Book A", quote: "A quote." },
    { id: "g-b", bookId: "b", bookTitle: "Book B", quote: "Another quote." },
    { id: "same", bookId: "a", bookTitle: "Book A", quote: "Same book." },
  ]);
  const candidates = validateGemEchoCandidates([{ a: "12", b: "g-b" }, { a: 12, b: "same" }], byId);
  assert.equal(candidates.length, 1);
  const pairs = validateGemEchoPairs([{ a: "12", b: "g-b", reason: "Grounded success", score: 0.82 }], byId, candidates);
  assert.deepEqual(pairs, [[12, "g-b", "Grounded success", 0.82]]);
  assert.equal(catalog.length, 3);
});

test("rejects unknown, same-book, low-score, malformed, and symmetric duplicates", () => {
  const { byId } = normalizeGemEchoCatalog([
    { id: "a", bookId: "one", quote: "Quote A" },
    { id: "b", bookId: "one", quote: "Quote B" },
    { id: "c", bookId: "two", quote: "Quote C" },
  ]);
  const candidates = validateGemEchoCandidates([{ a: "a", b: "c" }], byId);
  const pairs = validateGemEchoPairs([
    { a: "missing", b: "c", reason: "Unknown", score: 0.9 },
    { a: "a", b: "b", reason: "Same book", score: 0.9 },
    { a: "a", b: "c", reason: "Weak", score: 0.59 },
    { a: "a", b: "c", reason: "Shared idea", score: 0.8 },
    { a: "c", b: "a", reason: "Duplicate", score: 0.8 },
  ], byId, candidates);
  assert.deepEqual(pairs, [["a", "c", "Shared idea", 0.8]]);
});

test("keeps at most three validated links per gem", () => {
  const input = [{ id: "center", bookId: "a", quote: "Center" }, ...Array.from({ length: 5 }, (_, i) => ({ id: `g${i}`, bookId: `b${i}`, quote: `Quote ${i}` }))];
  const { byId } = normalizeGemEchoCatalog(input);
  const candidates = validateGemEchoCandidates(input.slice(1).map((gem) => ({ a: "center", b: gem.id })), byId);
  const pairs = validateGemEchoPairs(input.slice(1).map((gem, index) => ({ a: "center", b: gem.id, reason: `Idea ${index}`, score: 0.9 - index / 100 })), byId, candidates);
  assert.equal(pairs.length, 3);
  assert.deepEqual(pairs.map((pair) => pair[1]), ["g0", "g1", "g2"]);
});
