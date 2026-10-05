import { GoogleGenAI } from "@google/genai";
import { useCallback, useEffect, useRef, useState } from "react";
import { failureSummary } from "../liveErrors.js";
import { mintLiveToken } from "../tokenClient.js";

const MODELS = ["gemini-3.1-flash-live-preview", "gemini-2.5-flash-native-audio-preview-12-2025"];
const MAX_KEY_TRIES = 4;
const SILENT_LINE_MS = 9000;

// Gemini Live speaks; the orb level comes from the REAL audio.
// say() returns a promise that resolves when the line has FINISHED PLAYING.
// say().generated resolves as soon as the model finished producing it, so the caller
// can send the next line while this one is still playing (gapless speech).
export function useGeminiVoiceDriver({ voiceName = "Leda", muted = false } = {}) {
  const [speaking, setSpeaking] = useState(false);
  const [voiceOk, setVoiceOk] = useState(true);
  const levelRef = useRef(0);

  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const gainRef = useRef(null);
  const sessionRef = useRef(null);
  const nextTimeRef = useRef(0);
  const sourcesRef = useRef([]);
  const queueRef = useRef([]);          // lines the model is still generating
  const activeRef = useRef(new Set());  // lines not yet finished playing
  const fakeUntilRef = useRef(0);
  const speakingRef = useRef(false);
  const mutedRef = useRef(muted);
  const silentHandlerRef = useRef(null);
  const keyInfoRef = useRef(null);
  const systemTextRef = useRef("");
  const silentSwitchesRef = useRef(0);
  const recoveringRef = useRef(false);

  useEffect(() => {
    mutedRef.current = muted;
    if (gainRef.current) gainRef.current.gain.value = muted ? 0 : 1;
  }, [muted]);

  const stopAudio = useCallback(() => {
    sourcesRef.current.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } });
    sourcesRef.current = [];
    nextTimeRef.current = 0;
  }, []);

  const finishPlay = useCallback((l) => {
    if (l.playedDone) return;
    l.playedDone = true;
    clearTimeout(l.hard);
    clearTimeout(l.silentTimer);
    clearTimeout(l.playTimer);
    clearTimeout(l.startTimer);
    activeRef.current.delete(l);
    l.resolvePlayed(l.text || l.fallback || "");
  }, []);

  const finishGen = useCallback((l) => {
    if (l.genDone) return;
    l.genDone = true;
    clearTimeout(l.hard);
    clearTimeout(l.startTimer);
    queueRef.current = queueRef.current.filter((x) => x !== l);
    l.resolveGen();
    const ctx = ctxRef.current;
    const remain = ctx ? Math.max(0, (nextTimeRef.current - ctx.currentTime) * 1000) : 0;
    l.playTimer = setTimeout(() => finishPlay(l), remain + 30);
  }, [finishPlay]);

  const flush = useCallback(() => {
    [...activeRef.current].forEach((l) => {
      if (!l.genDone) { l.genDone = true; l.resolveGen(); }
      finishPlay(l);
    });
    queueRef.current = [];
    fakeUntilRef.current = 0;
  }, [finishPlay]);

  const playChunk = useCallback((b64) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const pcm = new Int16Array(bytes.buffer);
    const f32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) f32[i] = pcm[i] / 32768;
    const buf = ctx.createBuffer(1, f32.length, 24000);
    buf.copyToChannel(f32, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(analyserRef.current);
    const startAt = Math.max(ctx.currentTime + 0.02, nextTimeRef.current);
    src.start(startAt);
    nextTimeRef.current = startAt + buf.duration;
    sourcesRef.current.push(src);
    src.onended = () => { sourcesRef.current = sourcesRef.current.filter((s) => s !== src); };
    return startAt;
  }, []);

  const playPcm = useCallback((b64) => {
    const startAt = playChunk(b64);
    const ctx = ctxRef.current;
    if (startAt == null || !ctx) throw new Error("audio_context_unavailable");
    const durationMs = Math.max(0, (nextTimeRef.current - ctx.currentTime) * 1000);
    return new Promise((resolve) => setTimeout(resolve, durationMs + 30));
  }, [playChunk]);

  const prepareAudio = useCallback(async () => {
    let ctx = ctxRef.current;
    if (!ctx || ctx.state === "closed") {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC({ sampleRate: 24000 });
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      const gain = ctx.createGain();
      gain.gain.value = mutedRef.current ? 0 : 1;
      analyser.connect(gain);
      gain.connect(ctx.destination);
      ctxRef.current = ctx; analyserRef.current = analyser; gainRef.current = gain;
    }
    await Promise.race([ctx.resume(), new Promise((resolve) => setTimeout(resolve, 1500))]);
    return ctx.state === "running";
  }, []);

  // Call from a tap (browser audio rule). systemText = the personality prompt.
  const connect = useCallback(async (systemText, { blame = {} } = {}) => {
    systemTextRef.current = systemText;
    try {
      // a retry may run without a fresh tap, so never wait forever for the browser
      if (!(await prepareAudio())) throw new Error("audio_context_unavailable");

      let session = null;
      let failed = blame;
      let activeToken = null;
      // a key that cannot start a voice session is skipped quietly; the backend rests it
      for (let keyTry = 0; keyTry < MAX_KEY_TRIES && !session; keyTry += 1) {
      const tokenInfo = await mintLiveToken(failed);
      activeToken = tokenInfo;
      const ai = new GoogleGenAI({ apiKey: tokenInfo.token, httpOptions: { apiVersion: "v1alpha" } });
      let lastError = null;
      for (const model of MODELS) {
        try {
          session = await ai.live.connect({
            model,
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
              systemInstruction: { parts: [{ text: systemText }] },
              outputAudioTranscription: {},
            },
            callbacks: {
              onmessage: (m) => {
                if (session && sessionRef.current !== session) return;   // stale session after reset()
                const l = queueRef.current[0];
                if (m.data) {
                  if (!l) return;
                  l.gotAudio = true;
                  const at = playChunk(m.data);
                  if (l && !l.started && at != null) {
                    l.started = true;
                    clearTimeout(l.startTimer);
                    l.onStart?.(Math.max(0, (at - ctxRef.current.currentTime) * 1000));
                  }
                }
                const t = m.serverContent?.outputTranscription?.text;
                if (t && l) { l.text += t; l.onText?.(l.text); }
                if (m.serverContent?.turnComplete && l) {
                  if (!l.started) {
                    l.started = true;
                    clearTimeout(l.startTimer);
                    l.onStart?.(0);
                  }
                  finishGen(l);
                }
              },
              onerror: () => { if (!session || sessionRef.current === session) setVoiceOk(false); },
              onclose: () => { if (!session || sessionRef.current === session) sessionRef.current = null; },
            },
          });
          break;
        } catch (e) { lastError = e; /* try the fallback model */ }
      }
      if (session || !(tokenInfo.keyCount > 1)) break;
      failed = { failedKeyIndex: tokenInfo.keyIndex, failedKeyDay: tokenInfo.deviceDay, reason: failureSummary(lastError) || "no_reply" };
      }
      if (!session) throw new Error("no_model");
      keyInfoRef.current = activeToken;
      sessionRef.current = session;
      setVoiceOk(true);
      return true;
    } catch (e) {
      console.warn("[ONBOARDING] Gemini voice unavailable:", e);
      setVoiceOk(false);
      return false;
    }
  }, [voiceName, playChunk, finishGen, prepareAudio]);

  // orb level from real audio + speaking flag
  useEffect(() => {
    let raf;
    const buf = new Float32Array(512);
    const loop = () => {
      const ctx = ctxRef.current;
      const analyser = analyserRef.current;
      let target = 0;
      const playing = !!ctx && nextTimeRef.current > ctx.currentTime;
      const fake = performance.now() < fakeUntilRef.current;
      if (analyser && playing) {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        target = Math.min(1, Math.sqrt(sum / buf.length) * 7);
      } else if (fake) {
        target = 0.25 + 0.3 * Math.abs(Math.sin(performance.now() / 90));
      }
      levelRef.current += (target - levelRef.current) * 0.5;
      const on = playing || fake;
      if (on !== speakingRef.current) { speakingRef.current = on; setSpeaking(on); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const say = useCallback((instruction, { fallback = "", onText, onStart, timeoutMs = 30000, startTimeoutMs = 4000 } = {}) => {
    let resolveGen, resolvePlayed;
    const gen = new Promise((r) => { resolveGen = r; });
    const played = new Promise((r) => { resolvePlayed = r; });
    const l = { text: "", fallback, onText, onStart, started: false, resolveGen, resolvePlayed, genDone: false, playedDone: false, hard: null, playTimer: null, startTimer: null };
    activeRef.current.add(l);

    const offline = () => {           // no voice: caption + moving orb only
      const words = Math.max(8, fallback.split(/\s+/).length);
      const now = performance.now();
      const start = Math.max(now, fakeUntilRef.current);
      fakeUntilRef.current = start + Math.max(2200, words * 380);
      l.started = true;
      clearTimeout(l.startTimer);
      onStart?.(Math.max(0, start - now));
      onText?.(fallback);
      l.genDone = true;
      resolveGen();
      l.playTimer = setTimeout(() => finishPlay(l), fakeUntilRef.current - now);
    };

    const session = sessionRef.current;
    if (!session) {
      offline();
    } else {
      queueRef.current.push(l);
      l.hard = setTimeout(() => finishGen(l), timeoutMs);   // never hang
      // connected but no sound at all: this key/session is not answering, so move to another key
      l.silentTimer = setTimeout(() => { if (!l.gotAudio) silentHandlerRef.current?.(); }, SILENT_LINE_MS);
      if (startTimeoutMs > 0) {
        l.startTimer = setTimeout(() => {
          if (!l.started) { l.started = true; onStart?.(0); }
        }, startTimeoutMs);
      }
      try {
        session.sendRealtimeInput({ text: instruction });
      } catch {
        queueRef.current = queueRef.current.filter((x) => x !== l);
        clearTimeout(l.hard);
        offline();
      }
    }
    played.generated = gen;
    return played;
  }, [finishGen, finishPlay]);

  const stop = useCallback(() => { stopAudio(); flush(); }, [stopAudio, flush]);

  // Drops the current voice session (and anything it was still saying) but keeps the audio context for a fresh connect().
  const reset = useCallback(() => {
    stopAudio();
    flush();
    const old = sessionRef.current;
    sessionRef.current = null;
    try { old?.close(); } catch { /* already closed */ }
  }, [stopAudio, flush]);

  const close = useCallback(() => {
    stopAudio();
    flush();
    try { sessionRef.current?.close(); } catch { /* already closed */ }
    sessionRef.current = null;
    try { ctxRef.current?.close(); } catch { /* already closed */ }
    ctxRef.current = null;
  }, [stopAudio, flush]);

  useEffect(() => close, [close]);

  // A session that connected but never produced sound: rest that key and reconnect on the next one (at most twice).
  useEffect(() => {
    silentHandlerRef.current = () => {
      const info = keyInfoRef.current;
      if (recoveringRef.current || !info || !(info.keyCount > 1) || silentSwitchesRef.current >= 2) return;
      recoveringRef.current = true;
      silentSwitchesRef.current += 1;
      reset();
      connect(systemTextRef.current, {
        blame: { failedKeyIndex: info.keyIndex, failedKeyDay: info.deviceDay, reason: "no_reply (voice session stayed silent)" },
      }).finally(() => { recoveringRef.current = false; });
    };
  }, [reset, connect]);

  return { connect, say, playPcm, prepareAudio, stop, reset, close, speaking, voiceOk, levelRef };
}
export const MASCOT_VOICE_PROMPT =
  "You are the tiny mascot of a reading app, and you are speaking aloud for the very first time. " +
  "Every message looks like: [LINE] text. Say ONLY that text, word for word, in a playful, cheeky, slightly high-pitched tone with a natural INDIAN accent. " +
  "Keep the pace calm and conversational, a little slower than a normal fast voice, with no long dead air between phrases and no robotic pacing. " +
  "Use brief natural pauses only between thoughts, never after every single phrase. Hindi words in Roman letters are pronounced as Hindi. Never add or change words.";