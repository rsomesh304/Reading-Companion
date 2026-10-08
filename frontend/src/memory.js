import { dispatchLocalDataChanged } from "./accountSync.js";
import { DEVANAGARI_PATTERN } from "./persona.js";

const STORAGE_KEY = "reading_companion_memory";

// Words that change between paraphrases of the same fact ("likes" / "prefers" / "wants").
const FILLER = new Set([
  "the", "and", "that", "this", "with", "for", "from", "has", "have", "had", "was", "were", "are", "its",
  "reader", "user", "prefer", "preferred", "like", "want", "love", "enjoy", "need", "would", "should",
  "please", "remember", "asked", "also", "always", "alway", "very", "really", "much", "more", "when",
  "while", "about", "into", "them", "they", "their", "his", "her", "him", "she", "you", "your", "our",
  "will", "can", "not", "wants", "likes",
]);

function keywords(text) {
  return new Set(
    String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
      .map((word) => (word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word))
      .filter((word) => word.length > 2 && !FILLER.has(word)),
  );
}

// True when two memories say the same thing in different words.
function isSameMemory(a, b) {
  const first = keywords(a);
  const second = keywords(b);
  if (!first.size || !second.size) return false;
  let shared = 0;
  for (const word of first) if (second.has(word)) shared += 1;
  const smaller = Math.min(first.size, second.size);
  const union = first.size + second.size - shared;
  return shared / union >= 0.6 || (smaller >= 2 && shared / smaller >= 0.9);
}

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

  // Returns true when the memory is saved OR an equivalent one already exists.
  add(text) {
    const clean = (text || "").replace(/\s+/g, " ").trim();
    if (!clean) return false;
    if (DEVANAGARI_PATTERN.test(clean)) {
      console.warn("[MEMORY] Rejected non-English memory:", clean);
      return false;
    }
    if (!Array.isArray(this.memories)) this.memories = [];
    const sameIndex = this.memories.findIndex((m) => m.text === clean || isSameMemory(m.text, clean));
    if (sameIndex !== -1) {
      // Already saved, maybe worded differently: keep the more detailed wording instead of adding a copy.
      if (clean.length > this.memories[sameIndex].text.length + 8) {
        this.memories[sameIndex] = { text: clean, timestamp: this.memories[sameIndex].timestamp };
        this._save();
      }
      return true;
    }
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
    dispatchLocalDataChanged();
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