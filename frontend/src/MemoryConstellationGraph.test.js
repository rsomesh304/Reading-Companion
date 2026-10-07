import assert from "node:assert/strict";
import test from "node:test";
import { buildMindMapGraph, MIND_MAP_UNFILED_ID } from "./MemoryConstellationGraph.js";

function ownLinksFor(graph, gemId) {
  return graph.links.filter((link) => link.kind === "own" && (link.source === `gem:${gemId}` || link.target === `gem:${gemId}`));
}

function ownLinkPairs(graph) {
  return graph.links
    .filter((link) => link.kind === "own")
    .map((link) => [String(link.source), String(link.target)].sort().join(" -> "))
    .sort();
}

test("every gem keeps exactly one solid book link even when echo links exist across books", () => {
  const books = [
    { id: "atomic-habits-1700000000000", title: "Atomic Habits" },
    { id: "living-untethered-1700000000000", title: "Living Untethered" },
    { id: "courage-1700000000000", title: "The Courage to Be Disliked" },
  ];
  const gems = [
    { id: "living-1", bookId: "living-untethered", bookTitle: "Living Untethered — old title", chapterNumber: 2, quote: "Releasing control returns you to peace.", summary: "Release control.", embedding: [1, 0] },
    { id: "living-2", bookId: "", bookTitle: "Living Untethered", chapterNumber: 8, quote: "Surrender loosens fear and brings peace.", summary: "Surrender loosens fear.", embedding: [0.98, 0.02] },
    { id: "courage-1", bookId: "courage-1700000000000", bookTitle: "The Courage to Be Disliked", chapterNumber: 1, quote: "A small action loosens the hold of fear.", summary: "Small action loosens fear.", embedding: [0.99, 0.01] },
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `atomic-${index + 1}`,
      bookId: "atomic-habits-1700000000000",
      bookTitle: "Atomic Habits",
      chapterNumber: index + 1,
      quote: `System ${index + 1} turns a hard choice into a habit.`,
      summary: `Atomic gem ${index + 1}`,
      embedding: [0, 1],
    })),
  ];

  const { graph } = buildMindMapGraph(books, gems);
  gems.forEach((gem) => assert.equal(ownLinksFor(graph, gem.id).length, 1, `${gem.id} should have one owning book link`));
  assert.ok(graph.links.some((link) => link.kind === "echo" && [link.source, link.target].includes("gem:living-1") && [link.source, link.target].includes("gem:courage-1")));
  assert.deepEqual(ownLinksFor(graph, "living-1")[0], { source: "book:living-untethered-1700000000000", target: "gem:living-1", kind: "own", anchor: true });
  assert.deepEqual(ownLinksFor(graph, "living-2")[0], { source: "book:living-untethered-1700000000000", target: "gem:living-2", kind: "own", anchor: true });
});

test("unknown gems attach to an unfiled hub instead of floating freely", () => {
  const books = [{ id: "known-book-1700000000000", title: "Known Book" }];
  const gems = [
    { id: "known-title", bookId: null, bookTitle: "Known Book", chapterNumber: 1, quote: "This still belongs to the known book.", summary: "Known title fallback.", embedding: [0, 1] },
    { id: "orphan", bookId: "missing-book", bookTitle: "Unmatched title", chapterNumber: 2, quote: "This gem lost its original book link.", summary: "Needs fallback.", embedding: [1, 0] },
  ];

  const { graph } = buildMindMapGraph(books, gems);
  assert.ok(graph.nodes.some((node) => node.id === `book:${MIND_MAP_UNFILED_ID}` && node.label === "Unfiled gems"));
  assert.deepEqual(ownLinksFor(graph, "known-title")[0], { source: "book:known-book-1700000000000", target: "gem:known-title", kind: "own", anchor: true });
  assert.deepEqual(ownLinksFor(graph, "orphan")[0], { source: `book:${MIND_MAP_UNFILED_ID}`, target: "gem:orphan", kind: "own", anchor: true, fallback: true });
});

test("rebuilds preserve solid book links across reordered inputs and repeated graph construction", () => {
  const books = [
    { id: "one-1700000000000", title: "One" },
    { id: "two-1700000000000", title: "Two" },
  ];
  const gems = [
    { id: "g1", bookId: "one", bookTitle: "One", chapterNumber: 1, quote: "One idea.", summary: "One idea.", embedding: [1, 0] },
    { id: "g2", bookId: "two-1700000000000", bookTitle: "Two", chapterNumber: 1, quote: "Two idea.", summary: "Two idea.", embedding: [0, 1] },
    { id: "g3", bookId: "", bookTitle: "", chapterNumber: 2, quote: "Needs the unfiled hub.", summary: "Unfiled gem.", embedding: [0.3, 0.7] },
  ];

  const first = buildMindMapGraph(books, gems);
  const rebuilt = buildMindMapGraph([...books].reverse(), [...gems].reverse());

  assert.deepEqual(ownLinkPairs(first.graph), ownLinkPairs(rebuilt.graph));
  gems.forEach((gem) => assert.equal(ownLinksFor(first.graph, gem.id).length, 1));
  gems.forEach((gem) => assert.equal(ownLinksFor(rebuilt.graph, gem.id).length, 1));
});
