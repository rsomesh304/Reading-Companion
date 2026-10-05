export const SEMANTIC_SIMILARITY_THRESHOLD = 0.72;
export const MAX_ECHOES_PER_GEM = 3;

const FALLBACK_CONCEPTS = [
  ["self-awareness", /\b(self|myself|ourselves|identity|perception|perspective|see things|inner self|know yourself|wisdom|wise|clever|khud|apne aap|soch|nazariya)\b/i],
  ["inner-change", /\b(change|changing|transform|improve|growth|grow|become|badlav|badlaav|vikas|sudhar|khud ko badal)\b/i],
  ["courage-and-action", /\b(fear|afraid|courage|brave|risk|action|first step|begin|start|himmat|darr|dar|sahas|hausla|shuru|kadam)\b/i],
  ["habits-and-discipline", /\b(habit|routine|discipline|system|daily|repeat|consistent|small action|aadat|roz|niyamit|lagataar|abhyas)\b/i],
  ["humility-and-grounding", /\b(humble|humility|grounded|grounding|roots?|rooted|tall trees?|fly high|stay grounded|vinamrata|namrata|zameen|jad|jaden|vinamra)\b/i],
  ["patience-and-persistence", /\b(patient|patience|persist|persistence|slowly|wait|sabr|dhairya|intezar|dheere|lagan)\b/i],
  ["focus-and-attention", /\b(focus|attention|concentrate|present|mindful|dhyan|ekagrata|man laga|vartaman)\b/i],
  ["relationships-and-care", /\b(relationship|relationships|love|care|trust|friend|family|connection|rishta|pyaar|prem|bharosa|apnapan)\b/i],
  ["acceptance-and-letting-go", /\b(accept|acceptance|let go|release|forgive|forgiveness|svikar|sweekar|maaf|chhod|chhor)\b/i],
  ["learning-and-humility", /\b(learn|learning|mistake|listen|curious|teach|knowledge|seekhna|galti|sunna|gyan)\b/i],
];
const STOP_WORDS = new Set("a an and are as at be been being but by can could did do does doing for from had has have he her hers him his how i if in into is it its just me my of on or our ours she so than that the their them then there these they this those to too up us was we were what when where which who will with would you your yourself yourselves main mein mera meri mere mujhe hum hamara hamari hamare hai hain ho hua hui hu kar karo ki ke ko ka kaise kya par se tak toh to tha thi the bhi bas ek aur nahi nahin yeh ye woh wo jo jise jaisa jaise apna apni apne us usse un unka unki ekdum bahut zyada kuch koi sab har nahi kyunki aur phir bhi hi na".split(" "));
const CONCEPT_LEXICON = [
  ["discipline", ["habit", "routine", "discipline", "consistent", "regular", "aadat", "roz", "niyamit", "abhyas"]],
  ["courage", ["fear", "afraid", "courage", "brave", "risk", "himmat", "darr", "dar", "sahas", "hausla"]],
  ["growth", ["growth", "grow", "change", "improve", "evolve", "badlav", "badlaav", "vikas", "sudhar"]],
  ["humility", ["humble", "humility", "grounded", "grounding", "root", "rooted", "roots", "high", "tall", "fly", "zameen", "jad", "jaden", "vinamrata"]],
  ["patience", ["patient", "patience", "persist", "persistence", "wait", "sabr", "dhairya", "intezar", "lagan"]],
  ["focus", ["focus", "attention", "concentrate", "mindful", "dhyan", "ekagrata"]],
  ["relationships", ["relationship", "love", "care", "trust", "friend", "family", "connection", "rishta", "pyaar", "prem", "bharosa"]],
  ["acceptance", ["accept", "acceptance", "release", "forgive", "forgiveness", "svikar", "sweekar", "maaf", "chhod"]],
  ["identity", ["identity", "self", "myself", "become", "person", "who", "pehchan", "khud"]],
  ["learning", ["learn", "learning", "mistake", "curious", "knowledge", "seekhna", "galti", "gyan"]],
];

export function normalizeTheme(value) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9 -]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export function offlineThemes(text) {
  const value = String(text || "");
  return FALLBACK_CONCEPTS.filter(([, pattern]) => pattern.test(value)).map(([tag]) => tag);
}

function stemToken(token) {
  const value = String(token || "").toLowerCase();
  for (const suffix of ["ingly", "edly", "ments", "ment", "ation", "ations", "ing", "ed", "ies", "es", "s"]) {
    if (value.length > suffix.length + 3 && value.endsWith(suffix)) {
      return suffix === "ies" ? `${value.slice(0, -3)}y` : value.slice(0, -suffix.length);
    }
  }
  return value;
}

export function normalizedGemTokens(gem) {
  const text = `${gem?.quote || ""} ${gem?.coreIdea || ""} ${gem?.takeaway || ""}`
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return text.match(/[a-z0-9]+/g)?.map(stemToken).filter((token) => token.length > 2 && !STOP_WORDS.has(token)) || [];
}

function weightedDocuments(gems) {
  const tokenLists = gems.map(normalizedGemTokens);
  const docFreq = new Map();
  tokenLists.forEach((list) => new Set(list).forEach((token) => docFreq.set(token, (docFreq.get(token) || 0) + 1)));
  return tokenLists.map((list) => {
    const counts = new Map();
    list.forEach((token) => counts.set(token, (counts.get(token) || 0) + 1));
    const vector = new Map();
    for (const [token, count] of counts) {
      const tf = 1 + Math.log(count);
      const idf = Math.log((gems.length + 1) / ((docFreq.get(token) || 0) + 1)) + 1;
      vector.set(token, tf * idf);
    }
    return vector;
  });
}

function sparseCosine(left, right) {
  let dot = 0, normLeft = 0, normRight = 0;
  for (const value of left.values()) normLeft += value * value;
  for (const value of right.values()) normRight += value * value;
  for (const [token, value] of left) dot += value * (right.get(token) || 0);
  return normLeft && normRight ? dot / Math.sqrt(normLeft * normRight) : 0;
}

function sharedConcepts(left, right) {
  const leftTokens = new Set(normalizedGemTokens(left));
  const rightTokens = new Set(normalizedGemTokens(right));
  return CONCEPT_LEXICON.filter(([, terms]) => terms.some((term) => leftTokens.has(stemToken(term)))
    && terms.some((term) => rightTokens.has(stemToken(term)))).map(([name]) => name);
}

// Instant offline candidates; concepts bridge different wording and Roman Hinglish before AI verification.
export function buildLocalGemEchoes(gems, { maxLinksPerGem = MAX_ECHOES_PER_GEM, minimumSimilarity = 0.2 } = {}) {
  const docs = weightedDocuments(gems);
  const candidates = [];
  for (let leftIndex = 0; leftIndex < gems.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < gems.length; rightIndex += 1) {
      const left = gems[leftIndex], right = gems[rightIndex];
      const leftBook = bookKey(left), rightBook = bookKey(right);
      if (!leftBook || !rightBook || leftBook === rightBook) continue;
      const concepts = sharedConcepts(left, right);
      const lexical = sparseCosine(docs[leftIndex], docs[rightIndex]);
      const semantic = cosineSimilarity(left.embedding, right.embedding);
      const score = Math.max(lexical, semantic, concepts.length ? 0.62 : 0);
      if (score < minimumSimilarity) continue;
      const a = String(left.id), b = String(right.id);
      const reason = concepts.length ? concepts.slice(0, 2).join(" and ") : [...docs[leftIndex].keys()].filter((token) => docs[rightIndex].has(token)).slice(0, 3).join(", ");
      candidates.push({ a, b, score, sharedThemes: concepts, reason: reason || "A similar idea", source: "local" });
    }
  }
  candidates.sort((left, right) => right.score - left.score);
  const degrees = new Map();
  const selected = [];
  for (const candidate of candidates) {
    if ((degrees.get(candidate.a) || 0) >= maxLinksPerGem || (degrees.get(candidate.b) || 0) >= maxLinksPerGem) continue;
    selected.push(candidate);
    degrees.set(candidate.a, (degrees.get(candidate.a) || 0) + 1);
    degrees.set(candidate.b, (degrees.get(candidate.b) || 0) + 1);
  }
  return selected;
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
