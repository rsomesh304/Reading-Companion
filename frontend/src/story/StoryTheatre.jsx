import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Captions, Pause, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { motion as Motion } from "framer-motion";
import { useGeminiVoiceDriver } from "../onboarding/avatarDriver.js";
import { resolveStorySource } from "./resolveStorySource.js";
import { storyCacheId, getStoryScript } from "./storyScriptClient.js";
import MotifFilm from "./motifs/MotifFilm.jsx";
import "./StoryTheatre.css";

const VOICE_PROMPT = "You are a warm Indian storyteller. Every message begins [STORY_LINE]. Speak only the exact text after that prefix, word for word, in natural Hindi in Devanagari with simple English words where appropriate. Speak slowly, gently, with medium-low warmth and natural Indian pronunciation. Never add, remove, repeat, or translate anything.";
const EMPTY_MESSAGE = "Abhi is chapter ka kuch padha hi nahi gaya. Thoda padhiye, phir main kahani sunaunga.";

export default function StoryTheatre({ book, bookId, voiceName = "Leda", onClose, onRead }) {
  const source = resolveStorySource(book);
  const sourceId = storyCacheId(bookId, source);
  const [muted, setMuted] = useState(false);
  const driver = useGeminiVoiceDriver({ voiceName, muted });
  const driverRef = useRef(driver);
  useEffect(() => { driverRef.current = driver; }, [driver]);

  const runRef = useRef(0);
  const timerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const waitResolveRef = useRef(null);
  const closingRef = useRef(false);
  const playFromRef = useRef(null);
  const [script, setScript] = useState(null);
  const [phase, setPhase] = useState(() => source.mode === "empty" || !source.summary ? "empty" : "loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [voiceReady, setVoiceReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [subtitlesOn, setSubtitlesOn] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [activeBeat, setActiveBeat] = useState(0);
  const [subtitle, setSubtitle] = useState("");
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false);
  const phaseRef = useRef(phase);
  const activeBeatRef = useRef(activeBeat);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { activeBeatRef.current = activeBeat; }, [activeBeat]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return undefined;
    const update = () => setReducedMotion(media.matches);
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideTimerRef.current);
  }, []);

  const cancelPlayback = useCallback(() => {
    runRef.current += 1;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    waitResolveRef.current?.();
    waitResolveRef.current = null;
    driverRef.current.stop();
  }, []);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    runRef.current += 1;
    clearTimeout(timerRef.current);
    clearTimeout(hideTimerRef.current);
    timerRef.current = null;
    waitResolveRef.current?.();
    waitResolveRef.current = null;
    driverRef.current.stop();
    driverRef.current.close();
    onClose();
  }, [onClose]);

  const wait = useCallback((milliseconds, runId) => new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timerRef.current);
      timerRef.current = null;
      waitResolveRef.current = null;
      resolve(runRef.current === runId);
    };
    waitResolveRef.current = finish;
    timerRef.current = setTimeout(finish, milliseconds);
  }), []);

  const startBeat = useCallback((index, runId) => {
    const beat = script.beats[index];
    return driverRef.current.say(`[STORY_LINE] ${beat.narration}`, {
      fallback: beat.narration,
      onStart: () => {
        if (runRef.current !== runId) return;
        setActiveBeat(index);
        setSubtitle(beat.narration);
      },
    });
  }, [script]);

  const playFrom = useCallback(async (startIndex = 0) => {
    if (!script?.beats?.length || closingRef.current) return;
    cancelPlayback();
    const runId = runRef.current;
    const first = Math.max(0, Math.min(script.beats.length - 1, startIndex));
    setActiveBeat(first);
    setPaused(false);
    setPhase("playing");
    revealControls();

    const finishWithTimedLine = async () => {
      setSubtitle(script.closing_line);
      const words = script.closing_line.split(/\s+/).filter(Boolean).length;
      if (await wait(Math.max(1900, words * 380), runId)) setPhase("finished");
    };

    if (!voiceReady) {
      for (let index = first; index < script.beats.length; index++) {
        if (runRef.current !== runId) return;
        const beat = script.beats[index];
        setActiveBeat(index);
        setSubtitle(beat.narration);
        const words = beat.narration.split(/\s+/).filter(Boolean).length;
        if (!await wait(Math.max(1200, words * 380), runId)) return;
      }
      if (runRef.current === runId) await finishWithTimedLine();
      return;
    }

    let index = first;
    let currentLine = startBeat(index, runId);
    while (runRef.current === runId) {
      await currentLine.generated;
      if (runRef.current !== runId) return;
      const nextIndex = index + 1;
      const nextLine = nextIndex < script.beats.length
        ? startBeat(nextIndex, runId)
        : driverRef.current.say(`[STORY_LINE] ${script.closing_line}`, {
          fallback: script.closing_line,
          onStart: () => { if (runRef.current === runId) setSubtitle(script.closing_line); },
        });
      await currentLine;
      if (runRef.current !== runId) return;
      if (nextIndex >= script.beats.length) {
        await nextLine.generated;
        await nextLine;
        setPhase("finished");
        return;
      }
      currentLine = nextLine;
      index = nextIndex;
    }
  }, [cancelPlayback, revealControls, script, startBeat, voiceReady, wait]);
  useEffect(() => { playFromRef.current = playFrom; }, [playFrom]);

  useEffect(() => {
    if (source.mode === "empty" || !source.summary) {
      const timer = setTimeout(handleClose, 4600);
      return () => clearTimeout(timer);
    }
    const controller = new AbortController();
    let alive = true;
    const voiceConnection = driverRef.current.connect(VOICE_PROMPT);
    getStoryScript(bookId, source, { signal: controller.signal })
      .then(async ({ script: result }) => {
        const connected = await voiceConnection;
        if (!alive) { driverRef.current.close(); return; }
        setVoiceReady(connected);
        setScript(result);
        setPhase("title");
        timerRef.current = setTimeout(() => { if (alive) playFromRef.current?.(0); }, 2000);
      })
      .catch((error) => {
        if (!alive || error.name === "AbortError") return;
        setErrorMessage("Kahani abhi taiyaar nahi ho paayi. Thodi der baad phir koshish karein.");
        setPhase("error");
        timerRef.current = setTimeout(handleClose, 4000);
      });
    return () => {
      alive = false;
      controller.abort();
      clearTimeout(timerRef.current);
      clearTimeout(hideTimerRef.current);
      waitResolveRef.current?.();
      cancelPlayback();
      driverRef.current.close();
    };
    // Script cache identity is derived from precisely the resolved chapter summary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, sourceId, voiceName]);

  useEffect(() => {
    if (phase === "playing" && !paused && controlsVisible) {
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
      return () => clearTimeout(hideTimerRef.current);
    }
    clearTimeout(hideTimerRef.current);
    return undefined;
  }, [controlsVisible, paused, phase]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && phaseRef.current === "playing") {
        cancelPlayback();
        setPaused(true);
      }
    };
    const onKeyDown = (event) => { if (event.key === "Escape") handleClose(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [cancelPlayback, handleClose]);

  function togglePause() {
    if (paused) playFrom(activeBeatRef.current);
    else { cancelPlayback(); setPaused(true); }
  }

  function handleSurfacePointer(event) {
    if (event.target.closest("button")) return;
    revealControls();
  }

  const beat = script?.beats?.[activeBeat] || null;
  const palette = script?.palette || { bg1: "#101b35", bg2: "#343d71", accent: "#e9c878", accent2: "#79d9ca" };
  const title = script?.title || source.chapterTitle || book?.title || "A story remembered";
  const theatre = (
    <main className="st-root" onPointerDown={handleSurfacePointer}>
      {(phase === "playing" || phase === "finished") && beat && <MotifFilm beat={beat} beatIndex={activeBeat} palette={palette} mood={script?.mood} reducedMotion={reducedMotion} />}
      <div className="st-grain" aria-hidden="true" />

      <div className={`st-top ${controlsVisible || phase !== "playing" ? "visible" : "hidden"}`}>
        <div className="st-book-title">{book?.title || "Reading Companion"}<small>{source.chapterTitle || `Chapter ${source.chapterNumber}`}</small></div>
        <button type="button" className="st-control st-close" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); handleClose(); }} aria-label="Close story theatre"><X size={20} /></button>
      </div>

      {(phase === "loading" || phase === "title") && (
        <Motion.div className="st-opening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .8 }}>
          {phase === "loading" ? <><i className="st-ink" /><p>Kahani likhi ja rahi hai…</p></> : <h1>{title}</h1>}
        </Motion.div>
      )}

      {(phase === "empty" || phase === "error") && (
        <section className="st-message" role="status">
          <p>{phase === "empty" ? EMPTY_MESSAGE : errorMessage}</p>
          <button type="button" className="st-control" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); handleClose(); }} aria-label="Close story theatre"><X size={20} /></button>
        </section>
      )}

      {phase === "playing" && subtitlesOn && subtitle && <p className="st-subtitle" aria-live="polite">{subtitle}</p>}

      {phase === "playing" && (
        <div className={`st-controls ${controlsVisible ? "visible" : "hidden"}`}>
          <div className="st-control-row">
            <button type="button" className="st-control" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); togglePause(); }} aria-label={paused ? "Resume story" : "Pause story"}>{paused ? <Play size={18} /> : <Pause size={18} />}</button>
            <span className="st-control-spacer" />
            <button type="button" className="st-control" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setSubtitlesOn((value) => !value); }} aria-label={subtitlesOn ? "Hide subtitles" : "Show subtitles"}><Captions size={18} /></button>
            <button type="button" className="st-control" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setMuted((value) => !value); }} aria-label={muted ? "Unmute narration" : "Mute narration"}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
            <button type="button" className="st-control" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); playFrom(0); }} aria-label="Replay story"><RotateCcw size={17} /></button>
          </div>
        </div>
      )}

      {phase === "finished" && (
        <Motion.div className="st-finish" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .8 }}>
          <p>{script?.closing_line}</p>
          <div>
            <button type="button" className="st-secondary" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); playFrom(0); }}><RotateCcw size={16} /> Phir se sunao</button>
            <button type="button" className="st-primary" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); cancelPlayback(); driverRef.current.close(); onRead(); }}><Play size={16} /> Padhna shuru karo</button>
          </div>
        </Motion.div>
      )}
      <span className="st-sr-only" aria-live="polite">{phase === "playing" ? `Story beat ${activeBeat + 1}` : ""}</span>
    </main>
  );
  return createPortal(theatre, document.body);
}