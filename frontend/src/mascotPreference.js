const STORAGE_KEY = "reading_companion_mascot";
const DEFAULT_MASCOT = "owl";
const VALID_MASCOTS = ["owl", "robot", "sprout", "fox", "book"];

export function getMascot() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && VALID_MASCOTS.includes(stored) ? stored : DEFAULT_MASCOT;
  } catch {
    return DEFAULT_MASCOT;
  }
}

export function setMascot(characterId) {
  const next = VALID_MASCOTS.includes(characterId) ? characterId : DEFAULT_MASCOT;
  try {
    localStorage.setItem(STORAGE_KEY, next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app:mascot-changed", { detail: next }));
    }
  } catch {
    // ignore storage failures and keep the default fallback
  }
}
