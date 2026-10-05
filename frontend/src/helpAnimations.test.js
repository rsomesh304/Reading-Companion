import assert from "node:assert/strict";
import test from "node:test";
import { HELP_ANIMATIONS, HELP_ANIMATION_IDS, pickAnimationsByKeywords, sanitizeAnimationIds } from "./helpAnimations.js";

test("animation ids are unique", () => {
  assert.equal(new Set(HELP_ANIMATION_IDS).size, HELP_ANIMATIONS.length);
});

test("theme question maps to the appearance animation", () => {
  assert.equal(pickAnimationsByKeywords("how to change the color theme")[0], "set-appearance");
});

test("sanitizeAnimationIds drops unknown ids", () => {
  assert.deepEqual(sanitizeAnimationIds(["nope", HELP_ANIMATION_IDS[0]]), [HELP_ANIMATION_IDS[0]]);
});
