import assert from "node:assert/strict";
import test from "node:test";
import { detectNewReaderIntent, HELP_TOUR_SCENES } from "./helpTourData.js";

test("tour includes the core app journey and a final action scene", () => {
  assert.equal(HELP_TOUR_SCENES.length, 10);
  assert.equal(HELP_TOUR_SCENES.at(-1).id, "ready");
  for (const scene of HELP_TOUR_SCENES) {
    assert.ok(scene.title && scene.hinglish && scene.english && scene.visual, scene.id);
  }
});

test("direct beginner phrases start the tour locally in English and Hinglish", () => {
  for (const phrase of ["I am new", "first time", "new here", "pehli baar", "main naya hoon"]) {
    assert.equal(detectNewReaderIntent(phrase), "start", phrase);
  }
});

test("broad app confusion offers a one-tap tour locally", () => {
  for (const phrase of ["what is this app", "where do I start", "how to use this app", "kuch samajh nahi aa raha", "kaise use karun", "shuru kaise karun"]) {
    assert.equal(detectNewReaderIntent(phrase), "offer", phrase);
  }
});

test("specific feature questions are not mistaken for a beginner request", () => {
  assert.equal(detectNewReaderIntent("How do I save a quote?"), "none");
});
