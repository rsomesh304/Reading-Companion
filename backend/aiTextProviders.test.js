import assert from "node:assert/strict";
import test from "node:test";
import { getAiProviderOrder, requestTextCompletion, streamTextCompletion } from "./aiTextProviders.js";

const configured = {
  CLOUDFLARE_ACCOUNT_ID: "account",
  CLOUDFLARE_API_TOKEN: "cloudflare-token",
  GROQ_API_KEY: "groq-token",
};

test("report rewrites use only Cloudflare, even when Groq is configured", () => {
  assert.deepEqual(getAiProviderOrder("report", configured), ["cloudflare"]);
  assert.deepEqual(getAiProviderOrder("report", { GROQ_API_KEY: "groq-token" }), []);
});

test("help prefers Groq and falls back to Cloudflare when configured", () => {
  assert.deepEqual(getAiProviderOrder("help", configured), ["groq", "cloudflare"]);
  assert.deepEqual(getAiProviderOrder("help", { ...configured, GROQ_API_KEY: "" }), ["cloudflare"]);
  assert.deepEqual(getAiProviderOrder("help", { GROQ_API_KEY: "groq-token" }), ["groq"]);
  assert.deepEqual(getAiProviderOrder("help", {}), []);
});

test("help requests go to Groq first with fast gpt-oss settings", async () => {
  const calls = [];
  const result = await requestTextCompletion({
    feature: "help",
    messages: [{ role: "user", content: "Where is Library?" }],
    maxTokens: 100,
    stream: true,
    env: configured,
    fetchImpl: async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return new Response("{}", { status: 200 });
    },
  });
  assert.equal(result.provider, "groq");
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /api\.groq\.com/);
  assert.equal(calls[0].body.reasoning_effort, "low");
  assert.equal(calls[0].body.include_reasoning, false);
});

test("help falls back to Cloudflare when Groq fails", async () => {
  const urls = [];
  const result = await requestTextCompletion({
    feature: "help",
    messages: [{ role: "user", content: "Where is Library?" }],
    maxTokens: 100,
    stream: true,
    env: configured,
    fetchImpl: async (url) => {
      urls.push(url);
      return new Response("{}", { status: urls.length === 1 ? 503 : 200 });
    },
  });
  assert.equal(result.provider, "cloudflare");
  assert.equal(urls.length, 2);
  assert.match(urls[0], /api\.groq\.com/);
  assert.match(urls[1], /api\.cloudflare\.com/);
});

test("report rewrites go to Cloudflare only and fail without falling back to Groq", async () => {
  const urls = [];
  await assert.rejects(requestTextCompletion({
    feature: "report",
    messages: [{ role: "user", content: "Report text" }],
    maxTokens: 100,
    env: configured,
    fetchImpl: async (url) => {
      urls.push(url);
      return new Response("{}", { status: 503 });
    },
  }), /ai_providers_unavailable/);
  assert.equal(urls.length, 1);
  assert.match(urls[0], /api\.cloudflare\.com/);
});

test("a provider that exceeds its deadline is aborted", async () => {
  await assert.rejects(requestTextCompletion({
    feature: "help",
    messages: [{ role: "user", content: "Where is Library?" }],
    maxTokens: 100,
    env: configured,
    providerTimeoutMs: 10,
    fetchImpl: (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true })),
  }), /ai_providers_unavailable/);
});
test("streamTextCompletion parses split SSE frames and emits only text deltas", async () => {
  const chunks = [
    'data: {"choices":[{"delta":{"content":"A short "}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"answer."}}]}\n\ndata: [DONE]\n\n',
  ];
  const body = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(chunks[0].slice(0, 18)));
      controller.enqueue(encoder.encode(chunks[0].slice(18) + chunks[1]));
      controller.close();
    },
  });
  const tokens = [];
  const answer = await streamTextCompletion(new Response(body), (token) => tokens.push(token));
  assert.equal(answer, "A short answer.");
  assert.deepEqual(tokens, ["A short ", "answer."]);
});