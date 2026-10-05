import assert from "node:assert/strict";
import test from "node:test";
import { buildLocalGemEchoes, buildSemanticEchoes, cosineSimilarity, offlineThemes } from "./gemSemantics.js";

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

test("local TF-IDF concepts link different metaphors about humility and grounding", () => {
  const pairs = buildLocalGemEchoes([
    { id: "a", bookId: "a-book", quote: "No matter how high you fly, stay grounded." },
    { id: "b", bookId: "b-book", quote: "Tall trees are held up by roots no one sees." },
  ]);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].source, "local");
  assert.ok(pairs[0].sharedThemes.includes("humility"));
});

test("local concept lexicon links common Roman Hinglish terms and excludes same-book gems", () => {
  const gems = [
    { id: "a", bookId: "a-book", quote: "Himmat se darr ko paar karo." },
    { id: "b", bookId: "b-book", quote: "Courage helps us move beyond fear." },
    { id: "c", bookId: "a-book", quote: "Aadat roz ke chhote kadam se banti hai." },
  ];
  const pairs = buildLocalGemEchoes(gems);
  assert.ok(pairs.some((pair) => pair.a === "a" && pair.b === "b" && pair.sharedThemes.includes("courage")));
  assert.ok(pairs.every((pair) => !(pair.a === "a" && pair.b === "c")));
});

test("local fallback caps each gem at three strongest cross-book links", () => {
  const gems = [
    { id: "center", bookId: "a", quote: "Small habits and steady discipline help us grow with courage." },
    ...Array.from({ length: 5 }, (_, index) => ({ id: `g${index}`, bookId: "shared-target-book", quote: `A daily habit needs discipline and courage to grow ${index}.` })),
  ];
  const pairs = buildLocalGemEchoes(gems);
  assert.equal(pairs.filter((pair) => pair.a === "center" || pair.b === "center").length, 3);
});
