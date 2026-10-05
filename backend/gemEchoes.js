export function normalizeGemEchoCatalog(gems) {
  const normalized = [];
  const byId = new Map();
  for (const gem of (Array.isArray(gems) ? gems : []).slice(0, 64)) {
    if (!gem || !(typeof gem.id === "string" || typeof gem.id === "number") || !String(gem.id).trim()) continue;
    if (typeof gem.id === "number" && !Number.isFinite(gem.id)) continue;
    const id = String(gem.id);
    const quote = typeof gem.quote === "string" ? gem.quote.trim().slice(0, 700) : "";
    if (!quote || byId.has(id)) continue;
    const entry = {
      id,
      originalId: gem.id,
      bookId: String(gem.bookId || "").trim(),
      bookTitle: String(gem.bookTitle || "Unknown book").trim().slice(0, 160),
      bookKey: String(gem.bookId || gem.bookTitle || "").trim().toLowerCase(),
      quote,
      coreIdea: String(gem.coreIdea || "").trim().slice(0, 180),
      takeaway: String(gem.takeaway || "").trim().slice(0, 180),
      embedding: Array.isArray(gem.embedding) && gem.embedding.length <= 3072 && gem.embedding.every(Number.isFinite) ? gem.embedding : null,
    };
    normalized.push(entry);
    byId.set(id, entry);
  }
  return { catalog: normalized, byId };
}

export function echoPairKey(a, b) {
  return JSON.stringify([String(a), String(b)].sort());
}

export function validateGemEchoCandidates(candidates, byId) {
  const validated = [];
  const seen = new Set();
  for (const candidate of (Array.isArray(candidates) ? candidates : []).slice(0, 32)) {
    const a = byId.get(String(candidate?.a ?? ""));
    const b = byId.get(String(candidate?.b ?? ""));
    if (!a || !b || a.id === b.id || !a.bookKey || a.bookKey === b.bookKey) continue;
    const key = echoPairKey(a.id, b.id);
    if (seen.has(key)) continue;
    seen.add(key);
    validated.push({ a: a.id, b: b.id, key });
  }
  return validated;
}

export function validateGemEchoPairs(rawPairs, byId, candidates, { minimumScore = 0.6, maxLinksPerGem = 3 } = {}) {
  const allowed = new Set(candidates.map((pair) => pair.key));
  const normalized = [];
  const seen = new Set();
  for (const pair of (Array.isArray(rawPairs) ? rawPairs : [])) {
    const a = byId.get(String(pair?.a ?? ""));
    const b = byId.get(String(pair?.b ?? ""));
    const score = Number(pair?.score);
    if (!a || !b || a.id === b.id || !a.bookKey || a.bookKey === b.bookKey) continue;
    const key = echoPairKey(a.id, b.id);
    if (!allowed.has(key) || seen.has(key) || !Number.isFinite(score) || score < minimumScore) continue;
    const reason = String(pair?.reason || "").replace(/\s+/g, " ").trim().slice(0, 120);
    if (!reason) continue;
    seen.add(key);
    normalized.push({ a: a.id, b: b.id, originalA: a.originalId, originalB: b.originalId, reason, score: Math.min(1, score), key, aBook: a.bookKey, bBook: b.bookKey });
  }
  normalized.sort((left, right) => right.score - left.score);
  const degree = new Map();
  const accepted = [];
  for (const pair of normalized) {
    if ((degree.get(pair.a) || 0) >= maxLinksPerGem || (degree.get(pair.b) || 0) >= maxLinksPerGem) continue;
    degree.set(pair.a, (degree.get(pair.a) || 0) + 1);
    degree.set(pair.b, (degree.get(pair.b) || 0) + 1);
    accepted.push([pair.originalA, pair.originalB, pair.reason, pair.score]);
  }
  return accepted;
}
