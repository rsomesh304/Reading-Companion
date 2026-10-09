import test from "node:test";
import assert from "node:assert/strict";
import { createPageContextProvider } from "./sessionPage.js";

test("inline page is sent once per connection or new page", async () => {
  const sent = [];
  const client = { ready: true, sendVideoFrame: async (image) => sent.push(image) };
  const provider = createPageContextProvider();
  const page = { base64: "page-one", updatedAt: 1 };
  assert.equal(await provider.send(client, page, 1), true);
  assert.equal(await provider.send(client, page, 1), false);
  assert.equal(await provider.send(client, page, 2), true);
  assert.equal(await provider.send(client, { base64: "page-two", updatedAt: 2 }, 2), true);
  assert.deepEqual(sent, ["page-one", "page-one", "page-two"]);
});

test("cache strategy fails explicitly for Live", () => {
  assert.throws(() => createPageContextProvider("context-cache"), /does not support cachedContent/);
});
