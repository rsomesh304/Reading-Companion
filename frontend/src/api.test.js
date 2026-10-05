import assert from "node:assert/strict";
import test from "node:test";
import { apiFetchFast } from "./api.js";

test("apiFetchFast returns a cold-start response without retrying", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response("busy", { status: 503 });
  };

  try {
    const response = await apiFetchFast("/api/ai/help");
    assert.equal(response.status, 503);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("apiFetchFast aborts requests that exceed the timeout", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (_url, init) => new Promise((resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
  });

  try {
    await assert.rejects(apiFetchFast("/api/ai/help", {}, { timeoutMs: 10 }), { name: "AbortError" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});