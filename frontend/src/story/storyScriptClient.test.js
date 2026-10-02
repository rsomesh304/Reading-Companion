import assert from "node:assert/strict";
import test from "node:test";
import { getStoryScript, storyCacheId, storySourceHash } from "./storyScriptClient.js";

const source = { mode: "continue", chapterNumber: 3, chapterTitle: "The Crossing", summary: "A train arrived." };

test("story cache key is deterministic for an unchanged chapter source", () => {
  assert.equal(storySourceHash(source), storySourceHash({ ...source }));
  assert.equal(storyCacheId("book-a", source), storyCacheId("book-a", { ...source }));
});

test("story cache key changes when source truth changes", () => {
  assert.notEqual(storyCacheId("book-a", source), storyCacheId("book-a", { ...source, summary: "The train left." }));
  assert.notEqual(storyCacheId("book-a", source), storyCacheId("book-b", source));
});

test("replaying a cached story does not request another script", async () => {
  const previousStorage = globalThis.localStorage;
  const previousFetch = globalThis.fetch;
  const values = new Map();
  let requests = 0;
  globalThis.localStorage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
  globalThis.fetch = async () => {
    requests += 1;
    return { ok: true, json: async () => ({ script: { title: "The Crossing", beats: [{ narration: "A train arrived." }] } }) };
  };
  try {
    const first = await getStoryScript("book-a", source);
    const replay = await getStoryScript("book-a", source);
    assert.equal(first.cached, false);
    assert.equal(replay.cached, true);
    assert.equal(requests, 1);
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
    globalThis.fetch = previousFetch;
  }
});