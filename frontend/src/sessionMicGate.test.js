import test from "node:test";
import assert from "node:assert/strict";
import { SessionMicGate } from "./sessionMicGate.js";

test("silence stays local and the last 700ms precedes live chunks", () => {
  let time = 0;
  const sent = [];
  const gate = new SessionMicGate((chunk) => sent.push(chunk), () => sent.push("end"), { now: () => time });
  gate.accept("too-old");
  time = 800;
  gate.accept("first");
  time = 1250;
  gate.accept("second");
  assert.deepEqual(sent, []);
  gate.start();
  gate.accept("question");
  gate.end();
  assert.deepEqual(sent, ["first", "second", "question", "end"]);
  gate.accept("silent");
  assert.equal(sent.length, 4);
});
