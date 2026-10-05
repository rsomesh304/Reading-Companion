import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { Library } from "./library.js";

function makeStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
}
beforeEach(() => { globalThis.localStorage = makeStorage(); });
afterEach(() => { delete globalThis.localStorage; });

test("legacy vocabulary records normalize with safe optional-field defaults", () => {
  localStorage.setItem("reading_companion_library", JSON.stringify({ books: { b: { id: "b", title: "Book", chapters: { 1: { number: 1, vocabLog: [{ term: "quiet", meaning: "calm" }] } } } } }));
  const entry = new Library().getBook("b").chapters[1].vocabLog[0];
  assert.equal(entry.usageRegister, "uncertain");
  assert.equal(entry.practiceCount, 0);
  assert.equal(entry.recallSuccesses, 0);
  assert.deepEqual(entry.pronunciationHints, []);
});

test("practice, recall, and pronunciation observations update one vocabulary entry", () => {
  const library = new Library();
  const book = library.getOrCreateBook("Practice book");
  library.addVocab(book.id, 1, { term: "resilient", meaning: "able to recover", usageRegister: "everyday" });
  assert.equal(library.markVocabularyPracticed(book.id, 1, "resilient"), true);
  assert.equal(library.markVocabularyRecall(book.id, 1, "resilient", true), true);
  assert.equal(library.recordVocabularyPronunciation(book.id, 1, "resilient", "re-zil-yent"), true);
  const entry = library.getChapter(book.id, 1).vocabLog[0];
  assert.equal(entry.practiceCount, 1);
  assert.equal(entry.recallSuccesses, 1);
  assert.equal(entry.usageRegister, "everyday");
  assert.equal(entry.pronunciationHints[0].count, 1);
});

test("chapter deletion protects the last chapter and re-points the current chapter", () => {
  const library = new Library();
  const book = library.getOrCreateBook("Chapter safety");
  library.setChapterOutline(book.id, [
    { chapterNumber: 1, title: "First" },
    { chapterNumber: 2, title: "Second" },
  ]);
  library.setCurrentChapter(book.id, 2);
  const deleted = library.deleteChapter(book.id, 2);
  assert.deepEqual(deleted, { ok: true, currentChapterNumber: 1 });
  assert.equal(library.getChapter(book.id, 2), null);
  assert.equal(library.getBook(book.id).currentChapterNumber, 1);
  assert.deepEqual(library.deleteChapter(book.id, 1), { ok: false, reason: "last_chapter" });
});
