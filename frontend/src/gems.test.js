import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { Gems } from "./gems.js";

function makeStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

beforeEach(() => { globalThis.localStorage = makeStorage(); });
afterEach(() => { delete globalThis.localStorage; });

test("book-linked gems can be removed and restored without touching other books", () => {
  const gems = new Gems();
  const first = gems.add({ quote: "Keep this", bookId: "book-one" });
  gems.add({ quote: "Leave this", bookId: "book-two" });

  const archived = gems.removeForBook("book-one");
  assert.equal(archived.length, 1);
  assert.equal(gems.list().some((gem) => gem.bookId === "book-one"), false);
  assert.equal(gems.restoreMany(archived), 1);
  assert.equal(gems.getById(first.id).quote, "Keep this");
  assert.equal(gems.list().length, 2);
  assert.equal(gems.restoreMany(archived), 0);
});
