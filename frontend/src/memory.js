import { DEVANAGARI_PATTERN } from "./persona.js";

const STORAGE_KEY = "reading_companion_memory";

// Migrates old plain-string entries into { text, timestamp } objects so
// existing saved memories don't disappear when this structure lands.
function normalizeEntry(item) {
  if (typeof item === "string") return { text: item, timestamp: null };
  if (item && typeof item === "object" && typeof item.text === "string") {
    return { text: item.text, timestamp: item.timestamp || null };
  }
  return null;
}

export class CompanionMemory {
  constructor() {
    this.memories = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.memories = parsed.map(normalizeEntry).filter(Boolean);
        } else {
          console.warn("[MEMORY] Stored data wasn't an array - resetting.");
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      this.memories = [];
    }
  }

  add(text) {
    const clean = (text || "").replace(/\s+/g, " ").trim();
    if (!clean) return false;
    if (DEVANAGARI_PATTERN.test(clean)) {
      console.warn("[MEMORY] Rejected non-English memory:", clean);
      return false;
    }
    if (!Array.isArray(this.memories)) this.memories = [];
    if (this.memories.some((m) => m.text === clean)) return false;
    this.memories.push({ text: clean, timestamp: new Date().toISOString() });
    this.memories = this.memories.slice(-50);
    this._save();
    return true;
  }

  remove(text) {
    const idx = this.memories.findIndex((m) => m.text === text);
    if (idx === -1) return false;
    this.memories.splice(idx, 1);
    this._save();
    return true;
  }

  update(oldText, newText) {
    const idx = this.memories.findIndex((m) => m.text === oldText);
    if (idx === -1) return false;
    const clean = (newText || "").replace(/\s+/g, " ").trim();
    if (!clean) return false;
    this.memories[idx] = { text: clean, timestamp: this.memories[idx].timestamp };
    this._save();
    return true;
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memories));
  }

  promptContext() {
    if (!Array.isArray(this.memories) || !this.memories.length) return "";
    const recent = this.memories.slice(-20);
    return (
      "Persistent memory - things the reader has explicitly asked you to remember. " +
      "ALWAYS let these shape your behaviour and explanations with them:\n" +
      recent
        .map((m) => `- ${m.text}${m.timestamp ? ` (saved ${new Date(m.timestamp).toLocaleDateString()})` : ""}`)
        .join("\n")
    );
  }
}