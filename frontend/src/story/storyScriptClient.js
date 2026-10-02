const CACHE_KEY = "reading_companion_story_scripts_v1";

export function storySourceHash(source) {
  const input = [source.mode, source.chapterNumber, source.chapterTitle, source.summary].join("\u001f");
  let hash = 2166136261;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function storyCacheId(bookId, source) {
  return `${bookId}:${source.chapterNumber}:${storySourceHash(source)}`;
}

function readCache() {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    return cache && typeof cache === "object" && !Array.isArray(cache) ? cache : {};
  } catch {
    return {};
  }
}

function isUsableScript(script) {
  return !!script && typeof script.title === "string" && Array.isArray(script.beats) && script.beats.length > 0 &&
    script.beats.every((beat) => typeof beat?.narration === "string" && beat.narration.trim());
}

export async function getStoryScript(bookId, source, { signal } = {}) {
  const cache = readCache();
  const key = storyCacheId(bookId, source);
  if (isUsableScript(cache[key]?.script)) return { script: cache[key].script, cached: true };

  const response = await fetch("/api/story-script", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: {
      mode: source.mode,
      chapterNumber: source.chapterNumber,
      chapterTitle: source.chapterTitle,
      summary: source.summary,
      priorChapterSummaries: source.priorChapterSummaries || [],
      confidence: source.confidence,
    } }),
    signal,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !isUsableScript(payload?.script)) throw new Error(payload?.error || "story_script_unavailable");

  cache[key] = { script: payload.script, savedAt: new Date().toISOString() };
  const entries = Object.entries(cache).slice(-24);
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries))); } catch { /* cache is optional */ }
  return { script: payload.script, cached: false, fallback: !!payload.fallback };
}