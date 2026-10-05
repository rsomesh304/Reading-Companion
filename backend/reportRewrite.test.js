import assert from "node:assert/strict";
import test from "node:test";
import { cleanRewrite, stepsPreserved } from "./reportRewrite.js";

test("removes chatty preambles, labels and wrapping quotes", () => {
  assert.equal(cleanRewrite("Here is the improved response:\n\nDESCRIPTION: The app freezes on the Mind Map tab.", "app freeze on mind map tab"), "The app freezes on the Mind Map tab.");
  assert.equal(cleanRewrite("\"The story card looks broken on my phone.\"", "story card broke on phone"), "The story card looks broken on my phone.");
});

test("rejects empty, truncated or runaway rewrites", () => {
  assert.equal(cleanRewrite("", "something is wrong with the page"), null);
  assert.equal(cleanRewrite("ok", "something is wrong with the page and it keeps happening"), null);
  assert.equal(cleanRewrite("x".repeat(400), "short text here"), null);
});

test("rejects model refusals instead of treating them as rewrites", () => {
  const source = "Mascout appearance during book adding is visually unnecessary and making it ugly";
  assert.equal(cleanRewrite("I can't fulfill this request.", source), null);
  assert.equal(cleanRewrite("I cannot create content that promotes violence against any individual.", source), null);
  assert.equal(cleanRewrite("I'm sorry, but I can't help with that.", source), null);
  assert.equal(cleanRewrite("I don't have sound in the library.", "i dont have sound in libary"), "I don't have sound in the library.");
});

test("a rewrite may not add or remove steps", () => {
  assert.equal(stepsPreserved("1 open memory 2 tap mind map", "1. Open Memory. 2. Tap Mind Map."), true);
  assert.equal(stepsPreserved("1 open memory 2 tap mind map", "1. Open the app. 2. Open Memory. 3. Tap Mind Map."), false);
});
