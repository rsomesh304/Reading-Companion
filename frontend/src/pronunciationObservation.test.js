import assert from "node:assert/strict";
import test from "node:test";
import { findApproxSpokenVariant } from "./pronunciationObservation.js";

test("finds only a small transcription difference for an invited practice attempt", () => {
  assert.equal(findApproxSpokenVariant("resilient", "I will stay resilient through this"), "");
  assert.equal(findApproxSpokenVariant("resilient", "I want to be rezilient"), "rezilient");
  assert.equal(findApproxSpokenVariant("calm", "I feel calm"), "");
  assert.equal(findApproxSpokenVariant("resilient", "banana sandwich"), "");
});
