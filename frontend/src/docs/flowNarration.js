import { apiFetchFast } from "../api.js";
import { supabaseClient } from "../supabaseClient.js";
import { buildDocsNarrationSeed, DOCS_NARRATION_MODEL, DOCS_NARRATION_VOICE, normalizeDocsNarrationText } from "../../../shared/docsNarration.js";

const CACHE_NAME = "rc-docs-narration-v1";

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildNarrationCacheKey({ text, voice = DOCS_NARRATION_VOICE, model = DOCS_NARRATION_MODEL }) {
  const seed = buildDocsNarrationSeed({ text, voice, model });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed));
  return bytesToHex(new Uint8Array(digest)).slice(0, 32);
}

function cacheRequest(key) {
  return new Request(`https://rc-docs.local/narration/${key}`);
}

async function cacheStore(key, blob) {
  if (!("caches" in window)) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(cacheRequest(key), new Response(blob, { headers: { "Content-Type": blob.type || "audio/wav" } }));
}

async function cacheRead(key) {
  if (!("caches" in window)) return null;
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(cacheRequest(key));
  return response ? response.blob() : null;
}

export function estimateNarrationMs(text, speed = 1) {
  const words = normalizeDocsNarrationText(text).split(/\s+/).filter(Boolean).length;
  const base = Math.max(1400, words * 360);
  return Math.round(base / Math.max(0.5, speed || 1));
}

export function pickBrowserVoice() {
  const synth = window.speechSynthesis;
  if (!synth) return null;
  const voices = synth.getVoices();
  return voices.find((voice) => /^en(-|_)/i.test(voice.lang) && /female|zira|aria|samantha|google/i.test(voice.name))
    || voices.find((voice) => /^en(-|_)/i.test(voice.lang))
    || voices[0]
    || null;
}

export async function fetchNarrationAudio({ text, voice = DOCS_NARRATION_VOICE, model = DOCS_NARRATION_MODEL, signal } = {}) {
  const normalizedText = normalizeDocsNarrationText(text);
  const cacheKey = await buildNarrationCacheKey({ text: normalizedText, voice, model });
  const cachedBlob = await cacheRead(cacheKey);
  if (cachedBlob) {
    return { cacheKey, blob: cachedBlob, source: "cache", mimeType: cachedBlob.type || "audio/wav" };
  }

  const { data } = await supabaseClient.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("docs_owner_token_missing");

  const response = await apiFetchFast("/api/docs/narration", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text: normalizedText, voice, model }),
    signal,
  }, { timeoutMs: 20000 });

  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error(details.error || "docs_narration_unavailable");
  }

  const blob = await response.blob();
  await cacheStore(cacheKey, blob);
  return { cacheKey, blob, source: "server", mimeType: blob.type || "audio/wav" };
}
