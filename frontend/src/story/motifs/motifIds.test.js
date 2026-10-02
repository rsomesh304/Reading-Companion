import assert from "node:assert/strict";
import test from "node:test";
import { MOTIF_IDS, resolveMotifId } from "./motifIds.js";

test("unknown motif IDs fall back to constellation", () => {
  assert.equal(resolveMotifId("made_up_scene"), "constellation");
  assert.equal(resolveMotifId("storm_clouds"), "storm_clouds");
  assert.equal(MOTIF_IDS.length, 25);
});