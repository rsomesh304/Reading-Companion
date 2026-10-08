import test from "node:test";
import assert from "node:assert/strict";
import { classifyWakeTranscript, normalizeWakeText } from "./localWakeWord.js";

test("normalizes case and punctuation for wake-name matching", () => {
  assert.equal(normalizeWakeText("  Ember, are you there? "), "ember are you there");
});

test("recognizes a custom companion name as a wake phrase", () => {
  assert.deepEqual(classifyWakeTranscript("Ember, explain this line.", "Ember"), {
    intent: "wake",
    text: "Ember, explain this line.",
  });
});

test("does not wake when the companion name is merely mentioned in book text", () => {
  assert.equal(classifyWakeTranscript("The story introduces Ember in chapter two.", "Ember").intent, "ignore");
});

test("recognizes a greeting without requiring a companion name", () => {
  assert.equal(classifyWakeTranscript("Hello, can you help?", "Ember").intent, "wake");
});

test("quiet-reading instructions suppress a turn", () => {
  assert.equal(classifyWakeTranscript("I'm reading now, don't interrupt.", "Ember").intent, "reading");
  assert.equal(classifyWakeTranscript("Main padh raha hoon", "Ember").intent, "reading");
});

test("only accepts ordinary speech during the follow-up window", () => {
  assert.equal(classifyWakeTranscript("What does this word mean?", "Ember", true).intent, "follow-up");
  assert.equal(classifyWakeTranscript("What does this word mean?", "Ember", false).intent, "ignore");
});
