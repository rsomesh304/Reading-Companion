import { AnimatePresence, motion as Motion, useReducedMotion } from "framer-motion";
import {
    ArrowUp, BookOpen, Bookmark, Brain, Bug, Camera, Check, ChevronLeft, ChevronRight,
    Flame, Gem, Home, Mic, Network, Pause, Play, Quote, ScanText, Settings, Sparkles,
    UserRound, X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "./HelpTour.css";
import { HELP_TOUR_SCENES } from "./helpTourData.js";

const SCENE_MS = 6000;
const VISUALS = {
  welcome: [{ Icon: BookOpen, label: "Your book" }, { Icon: Sparkles, label: "Your buddy" }],
  library: [{ Icon: BookOpen, label: "Library" }, { Icon: Check, label: "Add book" }],
  session: [{ Icon: Mic, label: "Mic" }, { Icon: Camera, label: "Camera" }, { Icon: ScanText, label: "Page snapshot" }, { Icon: Quote, label: "Transcript" }],
  words: [{ Icon: BookOpen, label: "A new word" }, { Icon: Bookmark, label: "Vocabulary" }],
  gems: [{ Icon: Quote, label: "A line you love" }, { Icon: Gem, label: "Gems" }],
  chapters: [{ Icon: Check, label: "Chapter 1" }, { Icon: BookOpen, label: "Chapter 2" }, { Icon: ChevronRight, label: "Journey" }],
  home: [{ Icon: Flame, label: "Streak" }, { Icon: Home, label: "Home" }],
  memory: [{ Icon: Brain, label: "Memory" }, { Icon: Network, label: "Mind Map" }],
  profile: [{ Icon: UserRound, label: "Profile" }, { Icon: Settings, label: "Settings" }, { Icon: Bug, label: "Support" }],
  ready: [{ Icon: Sparkles, label: "You are ready" }],
};

function renderCopy(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    const bold = part.startsWith("**") && part.endsWith("**");
    const content = bold ? part.slice(2, -2) : part;
    return <Motion.span key={`${index}-${content}`} className={bold ? "help-tour-copy-strong" : undefined}
      initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.025, 0.25), duration: 0.28 }}>{content}</Motion.span>;
  });
}

function TourIllustration({ scene }) {
  const items = VISUALS[scene.visual] || VISUALS.welcome;
  return (
    <div className={`help-tour-art art-${scene.visual}`} aria-hidden="true">
      <div className="help-tour-art-glow" />
      <div className="help-tour-art-orb"><Sparkles size={28} /></div>
      <div className="help-tour-art-items">
        {items.map(({ Icon, label }, index) => (
          <div className={`help-tour-art-item item-${index + 1}`} key={label}>
            <span><Icon size={20} /></span><small>{label}</small>
          </div>
        ))}
      </div>
      {scene.visual === "session" && <div className="help-tour-dock-hint"><i /><i /><i /><i /></div>}
      {scene.visual === "chapters" && <div className="help-tour-path"><i /><i /><i /></div>}
      {scene.visual === "home" && <div className="help-tour-bars"><i /><i /><i /><i /><i /><i /><i /></div>}
      {scene.visual === "memory" && <div className="help-tour-links"><i /><i /><i /></div>}
      {scene.visual === "library" && <div className="help-tour-tap">tap</div>}
      {scene.visual === "ready" && <div className="help-tour-ready-check"><Check size={24} /></div>}
    </div>
  );
}

export default function HelpTour({ initialScene = 0, language: initialLanguage = "hinglish", onProgress, onComplete, onClose, onAddBook, onAskQuestion }) {
  const reducedMotion = useReducedMotion();
  const [sceneIndex, setSceneIndex] = useState(Math.max(0, Math.min(initialScene, HELP_TOUR_SCENES.length - 1)));
  const [language, setLanguage] = useState(initialLanguage);
  const [paused, setPaused] = useState(Boolean(reducedMotion));
  const [progress, setProgress] = useState({ sceneIndex: -1, value: 0 });
  const touchStart = useRef(null);
  const holdTimer = useRef(null);
  const held = useRef(false);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  const onCloseRef = useRef(onClose);
  const onAddBookRef = useRef(onAddBook);
  const onAskQuestionRef = useRef(onAskQuestion);
  useEffect(() => {
    onProgressRef.current = onProgress;
    onCompleteRef.current = onComplete;
    onCloseRef.current = onClose;
    onAddBookRef.current = onAddBook;
    onAskQuestionRef.current = onAskQuestion;
  });

  const scene = HELP_TOUR_SCENES[sceneIndex];
  const finalScene = sceneIndex === HELP_TOUR_SCENES.length - 1;

  useEffect(() => { onProgressRef.current?.(sceneIndex); }, [sceneIndex]);

  useEffect(() => {
    if (reducedMotion || paused) return undefined;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const fraction = Math.min(1, (Date.now() - startedAt) / SCENE_MS);
      setProgress({ sceneIndex, value: fraction });
      if (fraction >= 1) {
        window.clearInterval(timer);
        if (sceneIndex === HELP_TOUR_SCENES.length - 1) onCompleteRef.current?.();
        else setSceneIndex((current) => current + 1);
      }
    }, 60);
    return () => window.clearInterval(timer);
  }, [sceneIndex, paused, reducedMotion]);

  useEffect(() => () => window.clearTimeout(holdTimer.current), []);

  function goNext() {
    if (finalScene) return onCompleteRef.current?.();
    setSceneIndex((current) => Math.min(current + 1, HELP_TOUR_SCENES.length - 1));
  }

  function goPrevious() {
    setSceneIndex((current) => Math.max(0, current - 1));
  }

  function handlePointerDown(event) {
    if (event.target.closest("button")) return;
    held.current = false;
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      setPaused(true);
    }, 380);
  }

  function handlePointerUp() {
    window.clearTimeout(holdTimer.current);
    if (held.current) {
      held.current = false;
      setPaused(false);
    }
  }

  function handleTouchStart(event) {
    touchStart.current = event.touches[0]?.clientY ?? null;
  }

  function handleTouchEnd(event) {
    if (touchStart.current === null) return;
    const distance = (event.changedTouches[0]?.clientY ?? touchStart.current) - touchStart.current;
    touchStart.current = null;
    if (distance > 90) onCloseRef.current?.(sceneIndex);
  }

  function chooseBook() {
    onCompleteRef.current?.();
    onAddBookRef.current?.();
  }

  function askQuestion() {
    onCompleteRef.current?.();
    onAskQuestionRef.current?.();
  }

  return (
    <div className="help-tour" role="dialog" aria-modal="true" aria-label="Reading Companion first-time tour" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="help-tour-aurora" aria-hidden="true"><i /><i /><i /></div>
      <header className="help-tour-topbar">
        <div className="help-tour-progress" aria-label={`Scene ${sceneIndex + 1} of ${HELP_TOUR_SCENES.length}`}>
          {HELP_TOUR_SCENES.map((item, index) => (
            <span className="help-tour-progress-segment" key={item.id}>
              <i style={{ transform: `scaleX(${index < sceneIndex ? 1 : index === sceneIndex && progress.sceneIndex === sceneIndex ? progress.value : 0})` }} />
            </span>
          ))}
        </div>
        <div className="help-tour-controls">
          <div className="help-tour-language" role="group" aria-label="Tour language">
            <button type="button" className={language === "hinglish" ? "selected" : ""} onClick={() => setLanguage("hinglish")}>Hinglish</button>
            <button type="button" className={language === "english" ? "selected" : ""} onClick={() => setLanguage("english")}>English</button>
          </div>
          <button className="help-tour-round" type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Play tour" : "Pause tour"}>
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button className="help-tour-round" type="button" onClick={() => onCloseRef.current?.(sceneIndex)} aria-label="Close tour"><X size={19} /></button>
          <button className="help-tour-skip" type="button" onClick={() => onCloseRef.current?.(sceneIndex)}>Skip</button>
        </div>
      </header>

      <button className="help-tour-edge edge-left" type="button" onClick={goPrevious} aria-label="Previous scene"><ChevronLeft size={18} /></button>
      <button className="help-tour-edge edge-right" type="button" onClick={goNext} aria-label={finalScene ? "Finish tour" : "Next scene"}><ChevronRight size={18} /></button>

      <div className="help-tour-scene-area" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onPointerLeave={handlePointerUp}>
        <AnimatePresence mode="wait">
          <Motion.section className={`help-tour-scene scene-${scene.visual}`} key={scene.id}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 1.02 }}
            transition={{ duration: reducedMotion ? 0.12 : 0.42 }}>
            <TourIllustration scene={scene} />
            <div className="help-tour-copy">
              <span className="help-tour-scene-count">{String(sceneIndex + 1).padStart(2, "0")} / {String(HELP_TOUR_SCENES.length).padStart(2, "0")}</span>
              <h1>{scene.title}</h1>
              <p>{renderCopy(language === "english" ? scene.english : scene.hinglish)}</p>
            </div>
            <div className="help-tour-tags">{scene.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            {finalScene && (
              <div className="help-tour-final-actions">
                <button className="help-tour-primary" type="button" onClick={chooseBook}><BookOpen size={19} />Add my first book<ArrowUp size={17} /></button>
                <button className="help-tour-secondary" type="button" onClick={askQuestion}><Sparkles size={18} />Ask a question</button>
                <button className="help-tour-replay" type="button" onClick={() => { setSceneIndex(0); setPaused(Boolean(reducedMotion)); }}>Replay tour</button>
              </div>
            )}
          </Motion.section>
        </AnimatePresence>
      </div>
      <footer className="help-tour-footer">
        <span>{paused ? "Paused" : reducedMotion ? "Move through the tour at your pace" : "Tap either side to move · Hold to pause"}</span>
        <div>
          <button className="help-tour-round" type="button" onClick={goPrevious} disabled={sceneIndex === 0} aria-label="Previous scene"><ChevronLeft size={18} /></button>
          <button className="help-tour-round" type="button" onClick={goNext} aria-label={finalScene ? "Finish tour" : "Next scene"}>{finalScene ? <Check size={18} /> : <ChevronRight size={18} />}</button>
        </div>
      </footer>
    </div>
  );
}
