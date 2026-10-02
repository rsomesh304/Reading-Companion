const STORAGE_KEY = "reading_companion_gems";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // corrupted data - start fresh
  }
  return [];
}

function summarizeQuote(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "A meaningful takeaway from this book.";
  return clean.length > 120 ? `${clean.slice(0, 117).trim()}…` : clean;
}

function toStepArray(value) {
  if (Array.isArray(value)) return value.map((s) => String(s).trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function flattenTakeaway({ takeawaySituation, takeawaySteps, takeawayExample, takeawayWhyItMatters, legacyTakeaway }) {
  const parts = [];
  if (takeawaySituation) parts.push(takeawaySituation);
  if (takeawaySteps?.length) parts.push(takeawaySteps.map((s, i) => `${i + 1}) ${s}`).join("\n"));
  if (takeawayExample) parts.push(`Example: ${takeawayExample}`);
  if (takeawayWhyItMatters) parts.push(takeawayWhyItMatters);
  if (parts.length) return parts.join("\n");
  return legacyTakeaway || "";
}

function normalizeGem(raw) {
  const takeawaySituation = String(raw.takeawaySituation || "").trim();
  const takeawaySteps = toStepArray(raw.takeawaySteps);
  const takeawayExample = String(raw.takeawayExample || "").trim();
  const takeawayWhyItMatters = String(raw.takeawayWhyItMatters || "").trim();
  const legacyTakeaway = raw.takeaway ?? raw.application ?? "";
  const flatTakeaway = flattenTakeaway({ takeawaySituation, takeawaySteps, takeawayExample, takeawayWhyItMatters, legacyTakeaway });

  const quote = raw.quote || "";
  const authorName = raw.authorName || raw.attributedTo || "";
  const chapterNumber = raw.chapterNumber ?? raw.chapter ?? null;
  return {
    id: raw.id || `gem-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    bookId: raw.bookId || null,
    quote,
    takeawaySituation,
    takeawaySteps,
    takeawayExample,
    takeawayWhyItMatters,
    takeaway: flatTakeaway,
    application: flatTakeaway,
    bookTitle: raw.bookTitle || "",
    chapter: chapterNumber,
    chapterNumber,
    createdAt: raw.createdAt || new Date().toISOString(),
    sketch: raw.sketch ?? null,
    sketchStyle: raw.sketchStyle || null,
    summary: raw.summary || summarizeQuote(quote),
    quoteSource: raw.quoteSource || "",
    attributedTo: raw.attributedTo || authorName || "",
    authorName,
  };
}

export class Gems {
  constructor() {
    this.gems = load().map(normalizeGem);
  }
    _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.gems));
    } catch (e) {
      console.warn("[GEMS] save failed (storage full?)", e);
    }
    if (typeof window !== "undefined") window.dispatchEvent(new Event("gems:updated"));
  }
  add({
    quote, takeawaySituation, takeawaySteps, takeawayExample, takeawayWhyItMatters,
    takeaway, application, bookTitle, bookId, chapter, chapterNumber, summary,
    quoteSource, attributedTo, authorName,
  }) {
    const cleanQuote = (quote || "").trim();
    if (!cleanQuote) return false;
    const resolvedAuthor = attributedTo || authorName || "";
    const resolvedChapterNumber = chapterNumber ?? chapter ?? null;
    const saved = normalizeGem({
      id: `gem-${Date.now()}`,
      quote: cleanQuote,
      takeawaySituation,
      takeawaySteps,
      takeawayExample,
      takeawayWhyItMatters,
      takeaway: takeaway || application || "",
      bookTitle: bookTitle || "",
      bookId: bookId || null,
      chapter: resolvedChapterNumber,
      chapterNumber: resolvedChapterNumber,
      createdAt: new Date().toISOString(),
      sketch: null, // no auto-generation - user picks a style manually
      summary: summary || summarizeQuote(cleanQuote),
      quoteSource: quoteSource || "",
      attributedTo: resolvedAuthor,
      authorName: resolvedAuthor,
    });
    this.gems.unshift(saved);
    this._save();
    return saved;
  }
  getById(id) {
    return this.gems.find((g) => g.id === id) || null;
  }
  remove(id) {
    const idx = this.gems.findIndex((g) => g.id === id);
    if (idx === -1) return false;
    this.gems.splice(idx, 1);
    this._save();
    return true;
  }
  setSketchStyle(id, style) {
    const gem = this.getById(id);
    if (!gem) return false;
    gem.sketchStyle = style;
    this._save();
    return true;
  }
  markSketchPending(id) {
    const gem = this.getById(id);
    if (!gem) return false;
    gem.sketch = "pending";
    this._save();
    return true;
  }
  setSketchSuccess(id, dataUrl) {
    const gem = this.getById(id);
    if (!gem) return false;
    gem.sketch = { dataUrl, generatedAt: new Date().toISOString() };
    this._save();
    return true;
  }
  setSketchFailed(id) {
    const gem = this.getById(id);
    if (!gem) return false;
    gem.sketch = "failed";
    this._save();
    return true;
  }
  list() {
    return this.gems.map(normalizeGem);
  }
}