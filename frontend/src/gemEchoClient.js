import { apiUrl } from "./api.js";
import { buildLocalGemEchoes, MAX_ECHOES_PER_GEM } from "./gemSemantics.js";

const CACHE_KEY = "rc_gem_pair_echoes_v1";
const MAX_CACHE_ENTRIES = 500;
const PAIRS_PER_REQUEST = 16;

export function gemTextHash(gem) {
  const value = JSON.stringify([
    String(gem?.id ?? ""),
    String(gem?.bookId ?? gem?.bookTitle ?? ""),
    String(gem?.bookTitle || ""),
    String(gem?.quote || ""),
    String(gem?.coreIdea || ""),
    String(gem?.takeaway || ""),
  ]);
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function pairIds(a, b) {
  return [String(a), String(b)].sort();
}

export function gemPairCacheKey(a, b) {
  return JSON.stringify(pairIds(a?.id ?? a, b?.id ?? b));
}

export function gemPairSignature(a, b) {
  const ordered = [a, b].sort((left, right) => String(left.id).localeCompare(String(right.id)));
  return ordered.map(gemTextHash).join(":");
}

function readCache() {
  try {
    const value = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

function writeCache(cache) {
  try {
    const entries = Object.entries(cache).slice(-MAX_CACHE_ENTRIES);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch { /* cache is optional */ }
}

export function clearGemEchoCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* cache is optional */ }
}

function normalizeAiPairs(rawPairs, candidatePairs, gemById) {
  if (!Array.isArray(rawPairs)) return [];
  const allowed = new Set(candidatePairs.map(({ a, b }) => gemPairCacheKey(a, b)));
  const valid = [];
  for (const raw of rawPairs) {
    if (!Array.isArray(raw) || raw.length < 4) continue;
    const [rawA, rawB, rawReason, rawScore] = raw;
    const aId = String(rawA), bId = String(rawB);
    const left = gemById.get(aId), right = gemById.get(bId);
    if (!left || !right || aId === bId || gemPairCacheKey(aId, bId) === "") continue;
    if (String(left.bookId || left.bookTitle || "").toLowerCase() === String(right.bookId || right.bookTitle || "").toLowerCase()) continue;
    if (!allowed.has(gemPairCacheKey(aId, bId))) continue;
    const score = Number(rawScore);
    if (!Number.isFinite(score) || score < 0.6) continue;
    valid.push({
      a: aId,
      b: bId,
      score: Math.min(1, score),
      reason: String(rawReason || "Related ideas across books").replace(/\s+/g, " ").trim().slice(0, 120),
      sharedThemes: [],
      source: "ai",
      accepted: true,
    });
  }
  valid.sort((left, right) => right.score - left.score);
  const degree = new Map();
  const selected = [];
  const seen = new Set();
  for (const pair of valid) {
    const key = gemPairCacheKey(pair.a, pair.b);
    if (seen.has(key) || (degree.get(pair.a) || 0) >= MAX_ECHOES_PER_GEM || (degree.get(pair.b) || 0) >= MAX_ECHOES_PER_GEM) continue;
    seen.add(key);
    degree.set(pair.a, (degree.get(pair.a) || 0) + 1);
    degree.set(pair.b, (degree.get(pair.b) || 0) + 1);
    selected.push(pair);
  }
  return selected;
}

// Immediately yields a successful cache snapshot, then AI-verifies uncached local candidates in bounded chunks.
export async function fetchGemEchoes(gems, { fetcher = fetch, onUpdate = () => {}, onFailure = () => {} } = {}) {
  const catalog = gems.filter((gem) => gem?.id !== undefined && gem?.quote).slice(0, 600);
  const gemById = new Map(catalog.map((gem) => [String(gem.id), gem]));
  const candidates = buildLocalGemEchoes(catalog);
  const cache = readCache();
  const decisions = new Map();
  const unresolved = [];
  for (const pair of candidates) {
    const key = gemPairCacheKey(pair.a, pair.b);
    const signature = gemPairSignature(gemById.get(pair.a), gemById.get(pair.b));
    const cached = cache[key];
    if (cached?.signature === signature && cached?.verified === true) {
      decisions.set(key, { ...(cached.pair || { a: pair.a, b: pair.b, accepted: false, source: "ai" }), signature });
    } else unresolved.push({ ...pair, key, signature });
  }
  onUpdate([...decisions.values()]);

  for (let index = 0; index < unresolved.length; index += PAIRS_PER_REQUEST) {
    const chunk = unresolved.slice(index, index + PAIRS_PER_REQUEST);
    const ids = new Set(chunk.flatMap(({ a, b }) => [a, b]));
    const chunkGems = catalog.filter((gem) => ids.has(String(gem.id))).map((gem) => ({
      id: gem.id,
      bookId: gem.bookId,
      bookTitle: gem.bookTitle,
      quote: String(gem.quote).slice(0, 700),
      coreIdea: String(gem.coreIdea || "").slice(0, 180),
      takeaway: String(gem.takeaway || "").slice(0, 180),
    }));
    try {
      const response = await fetcher(apiUrl("/api/gem-echoes"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gems: chunkGems, candidates: chunk.map(({ a, b }) => ({ a, b })) }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.status !== "ok" || !Array.isArray(payload?.pairs)) {
        onFailure();
        continue;
      }
      const accepted = normalizeAiPairs(payload.pairs, chunk, gemById);
      const acceptedByKey = new Map(accepted.map((pair) => [gemPairCacheKey(pair.a, pair.b), pair]));
      for (const candidate of chunk) {
        const pair = { ...(acceptedByKey.get(candidate.key) || { a: candidate.a, b: candidate.b, accepted: false, source: "ai" }), signature: candidate.signature };
        decisions.set(candidate.key, pair);
        cache[candidate.key] = { signature: candidate.signature, verified: true, pair: pair.accepted ? pair : null, checkedAt: Date.now() };
      }
      writeCache(cache);
      onUpdate([...decisions.values()]);
    } catch {
      // Failures stay uncached; a later open or gems:updated event can retry.
      onFailure();
    }
  }
  return [...decisions.values()];
}
