import test from "node:test";
import assert from "node:assert/strict";
import { classifyVoiceIntent } from "./voiceIntent.js";

test("quiet-reading commands take priority over an addressed name", () => {
  assert.equal(classifyVoiceIntent("Sathi, I am going to read now", "Sathi"), "quiet");
  assert.equal(classifyVoiceIntent("Main ab padhne ja raha hoon", "Sathi"), "quiet");
  assert.equal(classifyVoiceIntent("Please don't interrupt me", "Sathi"), "quiet");
});

test("direct requests and companion greetings wake the listener", () => {
  assert.equal(classifyVoiceIntent("Sathi, tell me what this means", "Sathi"), "addressed");
  assert.equal(classifyVoiceIntent("Hello", "Sathi"), "addressed");
  assert.equal(classifyVoiceIntent("Achha iska matlab kya hai?", "Sathi"), "addressed");
});

test("ordinary reading text does not change the listening mode", () => {
  assert.equal(classifyVoiceIntent("The old house stood beside the river.", "Sathi"), "ambient");
});
