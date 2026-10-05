import { apiUrl } from "./api.js";
import { offlineThemes } from "./gemSemantics.js";

export function gemInsightHash(gem) {
  const text = `${String(gem?.bookTitle || "").trim()}\n${String(gem?.quote || "").trim()}`;
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

async function postJson(fetcher, path, body) {
  const response = await fetcher(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`request_failed_${response.status}`);
  return response.json();
}

// Backfills insights lazily and batches missing vectors; API/cache failures keep the local fallback available.
export async function ensureGemInsights(gems, onUpdate = () => {}, fetcher = fetch) {
  const unique = new Map(gems.filter((gem) => gem?.id && gem?.quote).map((gem) => [gem.id, gem]));
  const values = [...unique.values()];
  const output = [];
  for (let offset = 0; offset < values.length; offset += 32) {
    const batch = values.slice(offset, offset + 32);
    const prepared = await Promise.all(batch.map(async (gem) => {
      const hash = gemInsightHash(gem);
      const cached = gem.insightHash === hash;
      if (cached) return { gem, hash, themes: gem.themes, coreIdea: gem.coreIdea, embedding: gem.embedding || null, needsInsight: false };
      try {
        const insight = await postJson(fetcher, "/api/gem-insight", { quote: gem.quote, bookTitle: gem.bookTitle || "" });
        if (insight?.available === false || !Array.isArray(insight?.themes) || insight.themes.length < 2 || !insight.core_idea) {
          return { gem, hash, themes: offlineThemes(gem.quote), coreIdea: "", embedding: null, needsInsight: true, unavailable: true };
        }
        return { gem, hash, themes: insight.themes, coreIdea: insight.core_idea, embedding: gem.embedding || null, needsInsight: false };
      } catch {
        return { gem, hash, themes: offlineThemes(gem.quote), coreIdea: "", embedding: null, needsInsight: true, unavailable: true };
      }
    }));

    const embedTargets = prepared.filter((entry) => !entry.embedding && entry.coreIdea);
    if (embedTargets.length) {
      try {
        const result = await postJson(fetcher, "/api/embed", { texts: embedTargets.map((entry) => `${entry.gem.quote} ${entry.coreIdea}`) });
        for (const [index, entry] of embedTargets.entries()) {
          const vector = result?.embeddings?.[index];
          if (Array.isArray(vector) && vector.length && vector.every(Number.isFinite)) entry.embedding = vector;
        }
      } catch { /* theme tags still link ideas while offline */ }
    }

    for (const entry of prepared) {
      const insightHash = entry.hash;
      const unchanged = entry.gem.insightHash === insightHash
        && entry.gem.coreIdea === entry.coreIdea
        && JSON.stringify(entry.gem.themes || []) === JSON.stringify(entry.themes)
        && JSON.stringify(entry.gem.embedding || null) === JSON.stringify(entry.embedding || null);
      if (!unchanged) onUpdate(entry.gem.id, { themes: entry.themes, coreIdea: entry.coreIdea, embedding: entry.embedding, insightHash });
      output.push({ ...entry.gem, themes: entry.themes, coreIdea: entry.coreIdea, embedding: entry.embedding });
    }
  }
  return output;
}
