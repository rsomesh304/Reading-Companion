import assert from "node:assert/strict";
import test from "node:test";
import { isModelUnavailable, isQuotaError } from "./liveErrors.js";

class FakeCloseEvent {
  constructor(code, reason) { this._code = code; this._reason = reason; }
  get code() { return this._code; }
  get reason() { return this._reason; }
}

test("detects a quota rejection carried only in a WebSocket close reason", () => {
  assert.equal(isQuotaError(new FakeCloseEvent(1011, "Resource has been exhausted (e.g. check quota).")), true);
  assert.equal(isQuotaError(new FakeCloseEvent(1008, "You exceeded your current quota")), true);
});

test("detects quota errors thrown by the SDK", () => {
  assert.equal(isQuotaError({ message: "429 RESOURCE_EXHAUSTED" }), true);
  assert.equal(isQuotaError({ error: { code: 429, status: "RESOURCE_EXHAUSTED" } }), true);
});

test("does not treat ordinary closes or network errors as quota errors", () => {
  assert.equal(isQuotaError(new FakeCloseEvent(1000, "")), false);
  assert.equal(isQuotaError(new FakeCloseEvent(1006, "")), false);
  assert.equal(isQuotaError({ message: "setup timeout" }), false);
});

test("recognises an overloaded model separately from quota", () => {
  assert.equal(isModelUnavailable({ status: 503 }), true);
  assert.equal(isModelUnavailable(new FakeCloseEvent(1011, "The model is overloaded")), true);
  assert.equal(isModelUnavailable(new FakeCloseEvent(1000, "")), false);
});

test("key failures cover limits, rejected keys and policy closes", async () => {
  const { isKeyFailure, failureSummary } = await import("./liveErrors.js");
  assert.equal(isKeyFailure({ code: 1008, reason: "policy" }), true);
  assert.equal(isKeyFailure(new Error("API key expired. Please renew the API key.")), true);
  assert.equal(isKeyFailure(new Error("network down")), false);
  const text = failureSummary({ code: 1008, reason: "bad AIzaSyA1234567890abcdefghijklmnopqrstuv key" });
  assert.doesNotMatch(text, /AIzaSy/);
});
