import assert from "node:assert/strict";
import test from "node:test";
import { resolveStorySource } from "./resolveStorySource.js";

test("uses the current in-progress chapter summary only", () => {
  const result = resolveStorySource({
    currentChapterNumber: 2,
    chapters: {
      1: { number: 1, status: "closed", summary: "Earlier chapter facts." },
      2: { number: 2, title: "A Turn", status: "inprogress", summary: "A".repeat(160), vocabLog: [{ term: "excluded" }] },
    },
  });

  assert.equal(result.mode, "continue");
  assert.equal(result.chapterNumber, 2);
  assert.equal(result.chapterTitle, "A Turn");
  assert.equal(result.summary, "A".repeat(160));
  assert.deepEqual(result.priorChapterSummaries, ["Earlier chapter facts."]);
  assert.equal("vocabLog" in result, false);
  assert.equal(result.confidence, 1);
});

test("uses exactly the previous chapter when current summary is empty", () => {
  const result = resolveStorySource({
    currentChapterNumber: 3,
    chapters: {
      1: { number: 1, status: "closed", summary: "Older facts." },
      2: { number: 2, title: "The Last Stop", status: "closed", summary: "Previous chapter facts.", jumpNote: "This is excluded from story source." },
      3: { number: 3, status: "inprogress", summary: "" },
    },
  });

  assert.equal(result.mode, "new_chapter");
  assert.equal(result.chapterNumber, 2);
  assert.equal(result.chapterTitle, "The Last Stop");
  assert.equal(result.summary, "Previous chapter facts.");
  assert.deepEqual(result.priorChapterSummaries, ["Older facts."]);
  assert.equal(result.confidence, 0.4);
});

test("returns empty when current and immediately previous summaries are empty", () => {
  const result = resolveStorySource({
    currentChapterNumber: 3,
    chapters: {
      1: { number: 1, status: "closed", summary: "An older summary must not be selected." },
      2: { number: 2, status: "closed", summary: "" },
      3: { number: 3, status: "inprogress", summary: "" },
    },
  });

  assert.equal(result.mode, "empty");
  assert.equal(result.summary, "");
  assert.equal(result.confidence, 0);
});

test("uses the current summary even when its status is closed", () => {
  const result = resolveStorySource({
    currentChapterNumber: 1,
    chapters: { 1: { number: 1, status: "closed", summary: "Completed facts." } },
  });

  assert.equal(result.mode, "continue");
  assert.equal(result.summary, "Completed facts.");
});