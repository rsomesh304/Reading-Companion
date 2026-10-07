import test from "node:test";
import assert from "node:assert/strict";
import { __testables } from "./docsNarration.js";

test("cache keys change when text changes", () => {
  const a = __testables.createCacheKey({ text: "Step one", voice: "Leda" });
  const b = __testables.createCacheKey({ text: "Step two", voice: "Leda" });
  const c = __testables.createCacheKey({ text: "Step one", voice: "Leda" });
  assert.notEqual(a, b);
  assert.equal(a, c);
});

test("picks inline audio and converts pcm to wav", () => {
  const sample = Buffer.from(new Int16Array([0, 1200, -1200, 0]).buffer).toString("base64");
  const picked = __testables.pickAudioPart({
    candidates: [{ content: { parts: [{ inlineData: { data: sample, mimeType: "audio/pcm;rate=24000" } }] } }],
  });
  assert.ok(picked?.data);

  const playable = __testables.toPlayableAudio(picked);
  assert.equal(playable.mimeType, "audio/wav");
  assert.equal(playable.buffer.subarray(0, 4).toString("utf8"), "RIFF");
  assert.equal(playable.buffer.subarray(8, 12).toString("utf8"), "WAVE");
});

test("wraps audio/L16 output from Gemini TTS as WAV", () => {
  const out = __testables.toPlayableAudio({ data: Buffer.from([0, 1, 2, 3]).toString("base64"), mimeType: "audio/l16; rate=24000; channels=1" });
  assert.equal(out.mimeType, "audio/wav");
  assert.equal(out.buffer.subarray(0, 4).toString(), "RIFF");
});
