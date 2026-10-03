import assert from "node:assert/strict";
import test from "node:test";
import { computeBadges } from "./appBadges.js";

test("shows no badges when nothing needs attention", () => {
  assert.deepEqual(computeBadges(), { settings: 0, profile: 0 });
  assert.deepEqual(computeBadges({ updateAvailable: false }), { settings: 0, profile: 0 });
});

test("an available update badges Settings and the Profile tab", () => {
  assert.deepEqual(computeBadges({ updateAvailable: true }), { settings: 1, profile: 1 });
});
