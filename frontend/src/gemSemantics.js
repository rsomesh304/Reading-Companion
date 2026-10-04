export const SEMANTIC_SIMILARITY_THRESHOLD = 0.72;
export const MAX_ECHOES_PER_GEM = 3;

const FALLBACK_CONCEPTS = [
  ["self-awareness", /\b(self|myself|ourselves|identity|perception|perspective|see things|inner self|look within|know yourself|self-aware|wisdom|wise|clever)\b/i],
  ["inner-change", /\b(change|changing|changed|transform|transformation|improve|growth|grow|become|better version|yourself|myself)\b/i],
  ["courage-and-action", /\b(fear|afraid|courage|brave|risk|act|action|first step|begin|start|try|suffering)\b/i],
  ["habits-and-identity", /\b(habit|routine|system|daily|repeat|repeated|identity|small action|consistent)\b/i],
  ["humility-and-learning", /\b(humble|humility|learn|learning|mistake|mistakes|listen|curious|teach|knowledge)\b/i],
];

export function normalizeTheme(value) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9 -]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export function offlineThemes(text) {
  const value = String(text || "");
  return FALLBACK_CONCEPTS.filter(([, pattern]) => pattern.test(value)).map(([tag]) => tag);
}

export function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || !left.length) return 0;
  let dot = 0, normLeft = 0, normRight = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = Number(left[index]), b = Number(right[index]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    dot += a * b;
    normLeft += a * a;
    normRight += b * b;
  }
  if (!normLeft || !normRight) return 0;
  return dot / Math.sqrt(normLeft * normRight);
}

const bookKey = (gem) => String(gem.bookId || gem.bookTitle || "").trim().toLowerCase();
const gemText = (gem) => `${gem.quote || ""} ${gem.coreIdea || ""}`.trim();

// Pure cross-book edge builder, capped at three strongest echoes per gem.
export function buildSemanticEchoes(gems, threshold = SEMANTIC_SIMILARITY_THRESHOLD) {
  const candidates = [];
  for (let leftIndex = 0; leftIndex < gems.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < gems.length; rightIndex += 1) {
      const left = gems[leftIndex], right = gems[rightIndex];
      if (!bookKey(left) || bookKey(left) === bookKey(right)) continue;
      const leftThemes = new Set((left.themes || []).map(normalizeTheme).filter(Boolean));
      const rightThemes = new Set((right.themes || []).map(normalizeTheme).filter(Boolean));
      const sharedThemes = [...leftThemes].filter((tag) => rightThemes.has(tag));
      const score = cosineSimilarity(left.embedding, right.embedding);
      const fallbackShared = sharedThemes.length ? sharedThemes : offlineThemes(gemText(left)).filter((tag) => offlineThemes(gemText(right)).includes(tag));
      if (score < threshold && !fallbackShared.length) continue;
      const useThemes = sharedThemes.length ? sharedThemes : fallbackShared;
      const reason = String(left.coreIdea && right.coreIdea
        ? `${left.coreIdea} / ${right.coreIdea}`
        : useThemes.join(", ")).replace(/\s+/g, " ").slice(0, 120);
      candidates.push({ a: String(left.id), b: String(right.id), score: Math.max(score, useThemes.length ? threshold : 0), sharedThemes: useThemes, reason });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const counts = new Map();
  const selected = [];
  for (const candidate of candidates) {
    if ((counts.get(candidate.a) || 0) >= MAX_ECHOES_PER_GEM || (counts.get(candidate.b) || 0) >= MAX_ECHOES_PER_GEM) continue;
    selected.push(candidate);
    counts.set(candidate.a, (counts.get(candidate.a) || 0) + 1);
    counts.set(candidate.b, (counts.get(candidate.b) || 0) + 1);
  }
  return selected;
}
