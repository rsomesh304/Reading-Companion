import assert from "node:assert/strict";
import test from "node:test";
import { ensureGemInsights, gemInsightHash } from "./gemInsightClient.js";

test("cached gem insight prevents repeat backend calls", async () => {
  const gem = { id: "a", bookTitle: "One", quote: "A quote about perspective.", themes: ["self-awareness", "perception"], coreIdea: "Perspective begins with the self.", embedding: [1, 0], insightHash: "" };
  gem.insightHash = gemInsightHash(gem);
  let calls = 0;
  const fetcher = async () => { calls += 1; throw new Error("must not call"); };
  const result = await ensureGemInsights([gem], () => {}, fetcher);
  assert.equal(calls, 0);
  assert.equal(result[0].coreIdea, gem.coreIdea);
});

test("missing insights use bounded responses and save stable cache fields", async () => {
  const gem = { id: "b", bookTitle: "Book", quote: "We see ourselves in every choice." };
  const calls = [];
  const fetcher = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    if (calls.length === 1) return { ok: true, json: async () => ({ themes: ["self-awareness", "inner-change"], core_idea: "Choices reveal the self." }) };
    return { ok: true, json: async () => ({ embeddings: [[1, 0, 0]] }) };
  };
  let update;
  await ensureGemInsights([gem], (_id, value) => { update = value; }, fetcher);
  assert.equal(calls.length, 2);
  assert.equal(update.insightHash, gemInsightHash(gem));
  assert.deepEqual(update.embedding, [1, 0, 0]);
});

test("offline fallback is stored by quote hash and avoids repeated failed calls", async () => {
  const gem = { id: "offline", bookTitle: "Book", quote: "A small action helps us change ourselves." };
  let calls = 0;
  let update;
  const fetcher = async () => { calls += 1; throw new Error("offline"); };
  await ensureGemInsights([gem], (_id, value) => { update = value; }, fetcher);
  assert.deepEqual(update.themes, ["self-awareness", "inner-change", "courage-and-action", "habits-and-identity"]);
  assert.equal(update.insightHash, gemInsightHash(gem));
  await ensureGemInsights([{ ...gem, ...update }], () => {}, fetcher);
  assert.equal(calls, 1);
});
