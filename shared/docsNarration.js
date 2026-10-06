export const DOCS_NARRATION_MODEL = "gemini-3.1-flash-tts-preview";
export const DOCS_NARRATION_VOICE = "Leda";
export const DOCS_NARRATION_KEY_VERSION = 1;

export function normalizeDocsNarrationText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

export function buildDocsNarrationSeed({
  text,
  voice = DOCS_NARRATION_VOICE,
  model = DOCS_NARRATION_MODEL,
  version = DOCS_NARRATION_KEY_VERSION,
} = {}) {
  return JSON.stringify({
    version,
    model: String(model || DOCS_NARRATION_MODEL).trim(),
    voice: String(voice || DOCS_NARRATION_VOICE).trim(),
    text: normalizeDocsNarrationText(text),
  });
}
