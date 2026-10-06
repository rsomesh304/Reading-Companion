import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDocsNarrationSeed, DOCS_NARRATION_MODEL, DOCS_NARRATION_VOICE, normalizeDocsNarrationText } from "../shared/docsNarration.js";

const CACHE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), ".cache", "docs-narration");
const memoryCache = new Map();

function createCacheKey({ text, voice = DOCS_NARRATION_VOICE, model = DOCS_NARRATION_MODEL }) {
  return createHash("sha256").update(buildDocsNarrationSeed({ text, voice, model })).digest("hex").slice(0, 32);
}

function pickAudioPart(result) {
  return result?.candidates?.flatMap((candidate) => candidate.content?.parts || [])
    .find((part) => part.inlineData?.data)?.inlineData || null;
}

function pcmToWavBuffer(base64Pcm, sampleRate = 24000) {
  const pcm = Buffer.from(base64Pcm, "base64");
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function toPlayableAudio(audioPart) {
  if (!audioPart?.data) throw new Error("docs_narration_audio_missing");
  const mimeType = String(audioPart.mimeType || "");
  if (/^audio\/(pcm|l16)/i.test(mimeType)) {
    const sampleRate = Number(/rate=(\d+)/i.exec(mimeType)?.[1] || 24000);
    return { mimeType: "audio/wav", buffer: pcmToWavBuffer(audioPart.data, sampleRate) };
  }
  return { mimeType: mimeType || "audio/wav", buffer: Buffer.from(audioPart.data, "base64") };
}

async function readCache(cacheKey) {
  if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey);
  try {
    const raw = await readFile(resolve(CACHE_DIR, `${cacheKey}.json`), "utf8");
    const parsed = JSON.parse(raw);
    const cached = {
      mimeType: parsed.mimeType || "audio/wav",
      buffer: Buffer.from(parsed.audio, "base64"),
    };
    memoryCache.set(cacheKey, cached);
    return cached;
  } catch {
    return null;
  }
}

async function writeCache(cacheKey, value) {
  memoryCache.set(cacheKey, value);
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(resolve(CACHE_DIR, `${cacheKey}.json`), JSON.stringify({
    mimeType: value.mimeType,
    audio: value.buffer.toString("base64"),
  }));
}

function validVoice(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(value) ? value : DOCS_NARRATION_VOICE;
}

function validModel(value) {
  const model = typeof value === "string" ? value.trim() : "";
  return model === DOCS_NARRATION_MODEL ? model : DOCS_NARRATION_MODEL;
}

export function registerDocsNarration(app, {
  verifyDocsOwner,
  allowAiRequestForResponse,
  refundAiRequest,
  finishAiRequest,
  generateGeminiContent,
  redactSecrets,
} = {}) {
  app.post("/api/docs/narration", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const access = await verifyDocsOwner({ authorization: req.get("authorization") || "" });
    if (!access.allowed) return res.status(403).json({ error: "forbidden", reason: access.reason });

    const text = normalizeDocsNarrationText(req.body?.text);
    if (text.length < 12 || text.length > 1200) return res.status(400).json({ error: "bad_text" });

    const voice = validVoice(req.body?.voice);
    const model = validModel(req.body?.model);
    const cacheKey = createCacheKey({ text, voice, model });
    res.set("X-Docs-Narration-Key", cacheKey);
    res.set("X-Docs-Narration-Voice", voice);
    res.set("X-Docs-Narration-Model", model);

    const cached = await readCache(cacheKey);
    if (cached) return res.type(cached.mimeType).send(cached.buffer);

    let reserved = false;
    try {
      if (!allowAiRequestForResponse(req, res, "docsNarration")) return undefined;
      reserved = true;
      const result = await generateGeminiContent({
        model,
        contents: text,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
      });
      const playable = toPlayableAudio(pickAudioPart(result));
      await writeCache(cacheKey, playable);
      return res.type(playable.mimeType).send(playable.buffer);
    } catch (error) {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      if (reserved) refundAiRequest("docsNarration", ip);
      console.warn("[DOCS_TTS] request failed:", redactSecrets(error?.message || error, 180));
      return res.status(503).json({ error: "docs_narration_unavailable" });
    } finally {
      if (reserved) finishAiRequest();
    }
  });
}

export const __testables = {
  createCacheKey,
  pickAudioPart,
  pcmToWavBuffer,
  toPlayableAudio,
};
