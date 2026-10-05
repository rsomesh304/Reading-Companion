import assert from "node:assert/strict";
import test from "node:test";
import { classifyLiveFailure, describeLiveStatus, friendlyErrorMessage, userNoticeForFailure } from "./friendlyErrors.js";

test("healthy and transient statuses show nothing", () => {
  assert.equal(describeLiveStatus("connected"), null);
  assert.equal(describeLiveStatus("thinking…"), null);
  assert.equal(describeLiveStatus(""), null);
});

test("connection states map to friendly notices", () => {
  assert.equal(describeLiveStatus("Connecting...").code, "connecting");
  assert.equal(describeLiveStatus("reconnecting (2/5)").code, "reconnecting");
  assert.equal(describeLiveStatus("switching to backup model").code, "model");
  assert.equal(describeLiveStatus("switching to another key").code, "key_switch");
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

test("live failures distinguish key faults from silence and retryable transport errors", () => {
  assert.equal(classifyLiveFailure({ status: 403, message: "PERMISSION_DENIED" }), "key_fault");
  assert.equal(classifyLiveFailure({ code: 1008, reason: "policy violation" }), "transient");
  assert.equal(classifyLiveFailure({ status: 429 }), "quota");
  assert.equal(classifyLiveFailure({ message: "no_reply connected but the model stayed silent" }), "silent");
  assert.equal(classifyLiveFailure(new Error("Failed to fetch")), "network");
  assert.doesNotMatch(userNoticeForFailure("key_fault").message, /session band karke/i);
  assert.doesNotMatch(userNoticeForFailure("quota").message, /saved baat/i);
});
