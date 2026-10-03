import assert from "node:assert/strict";
import test from "node:test";
import { describeLiveStatus, friendlyErrorMessage } from "./friendlyErrors.js";

test("healthy and transient statuses show nothing", () => {
  assert.equal(describeLiveStatus("connected"), null);
  assert.equal(describeLiveStatus("thinking…"), null);
  assert.equal(describeLiveStatus(""), null);
});

test("connection states map to friendly notices", () => {
  assert.equal(describeLiveStatus("Connecting...").code, "connecting");
  assert.equal(describeLiveStatus("reconnecting (2/5)").code, "reconnecting");
  assert.equal(describeLiveStatus("switching to backup model").code, "model");
  assert.equal(describeLiveStatus("switching to another key").code, "capacity");
  assert.equal(describeLiveStatus("error: boom - tap End and restart").kind, "error");
  assert.equal(describeLiveStatus("Mic error: Permission denied").code, "mic");
  assert.equal(describeLiveStatus("Camera error: x").code, "camera");
});

test("raw technical text is never returned", () => {
  const text = friendlyErrorMessage(new Error("TypeError: Failed to fetch"));
  assert.doesNotMatch(text, /TypeError/);
  assert.match(friendlyErrorMessage(new Error("RESOURCE_EXHAUSTED")), /busy/);
  assert.equal(friendlyErrorMessage(null, "fallback"), "fallback");
});
