import test from "node:test";
import assert from "node:assert/strict";
import { cleanChapterTitle, findBooks, normalizeToc, fetchTocByIsbn, parseVisionChapters, validateImages } from "./bookLookup.js";

const json = (body, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => body });

test("falls back to Open Library when Google is rate limited", async () => {
  const fetchImpl = (url) => (url.includes("googleapis") ? json({}, 429) : json({ docs: [{ key: "/works/OL1W", title: "Clean Code", author_name: ["Robert C. Martin"], isbn: ["9780132350884"], cover_i: 7 }] }));
  const r = await findBooks("clean code", { fetchImpl });
  assert.equal(r.via, "openlibrary");
  assert.equal(r.books[0].isbns[0], "9780132350884");
});

test("uses Google Books first", async () => {
  const fetchImpl = () => json({ items: [{ id: "x", volumeInfo: { title: "Deep Work", authors: ["Cal Newport"], industryIdentifiers: [{ identifier: "9781455586691" }], imageLinks: { thumbnail: "http://img/x" } } }] });
  const r = await findBooks("deep work", { fetchImpl });
  assert.equal(r.via, "google");
  assert.equal(r.books[0].coverUrl, "https://img/x");
});

test("normalizeToc keeps top level and optional pages", () => {
  const out = normalizeToc([{ level: 0, label: "1", title: "Start", pagenum: "3" }, { level: 1, title: "Sub" }, { level: 0, title: "End" }]);
  assert.deepEqual(out.map((c) => [c.title, c.startPage]), [["Start", 3], ["End", null]]);
});

test("a single-entry table of contents is not trusted", async () => {
  const fetchImpl = () => json({ table_of_contents: [{ title: "Only one" }] });
  assert.equal((await fetchTocByIsbn(["9780132350884"], { fetchImpl })).chapters.length, 0);
});

test("vision output never gains chapters and bad input is empty", () => {
  assert.equal(parseVisionChapters("not json").length, 0);
  assert.deepEqual(parseVisionChapters('{"chapters":[{"title":"A","page":1},{"title":"a"},{"title":"B","page":null}]}').map((c) => c.title), ["A", "B"]);
});

test("image validation", () => {
  assert.equal(validateImages(["data:text/html;base64,AAAA"]), null);
  assert.equal(validateImages(["data:image/jpeg;base64,AAAA"]).length, 1);
});

test("printed chapter prefixes are removed", () => {
  assert.equal(cleanChapterTitle("Chapter 2 Meaningful Names"), "Meaningful Names");
  assert.equal(cleanChapterTitle("3. Functions"), "Functions");
  assert.equal(cleanChapterTitle("Chapter 4: Comments"), "Comments");
  assert.equal(cleanChapterTitle("Chapter 7"), "Chapter 7");
  assert.equal(cleanChapterTitle("1984 Revisited"), "1984 Revisited");
});
