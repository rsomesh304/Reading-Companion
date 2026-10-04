import assert from "node:assert/strict";
import test from "node:test";
import { buildSemanticEchoes, cosineSimilarity, offlineThemes } from "./gemSemantics.js";

test("quotes about perception and change beginning with the self connect without matching hard-coded pairs", () => {
  const [left, right] = [
    { id: "a", bookId: "book-a", quote: "We don't see things as they are, we see them as we are." },
    { id: "b", bookId: "book-b", quote: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself." },
  ];
  assert.ok(offlineThemes(left.quote).some((theme) => offlineThemes(right.quote).includes(theme)));
  assert.equal(buildSemanticEchoes([left, right]).length, 1);
});

test("unrelated quotes and same-book quotes do not connect", () => {
  const unrelated = [
    { id: "a", bookId: "book-a", quote: "A red boat crossed the cold ocean at sunrise." },
    { id: "b", bookId: "book-b", quote: "Mix flour with sugar and bake the bread." },
  ];
  assert.deepEqual(buildSemanticEchoes(unrelated), []);
  assert.deepEqual(buildSemanticEchoes([{ ...unrelated[0], embedding: [1, 0] }, { ...unrelated[1], bookId: "book-a", embedding: [1, 0] }]), []);
});

test("embedding similarity and three-edge cap are enforced", () => {
  assert.ok(cosineSimilarity([1, 0], [0.99, 0.01]) > 0.99);
  const gems = [{ id: "center", bookId: "a", quote: "", embedding: [1, 0] },
    ...Array.from({ length: 5 }, (_, index) => ({ id: `g${index}`, bookId: `b${index}`, quote: "", embedding: [1, index / 100] }))];
  const pairs = buildSemanticEchoes(gems);
  assert.equal(pairs.filter((pair) => pair.a === "center" || pair.b === "center").length, 3);
});
