import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, Lightbulb, AlertTriangle, Info, HelpCircle, Copy, Check, RotateCcw, Volume2, VolumeX, Captions, LoaderCircle } from "lucide-react";
import HelpAnimations from "../HelpAnimations.jsx";
import "../HelpGuideScreen.css";
import { DIAGRAMS, FLOWS } from "./registry.js";
import { slugify } from "./text.js";
import { Diagram as DiagramSvg } from "./diagram.jsx";
import { DOCS_NARRATION_MODEL, DOCS_NARRATION_VOICE } from "../../../shared/docsNarration.js";
import { estimateNarrationMs, fetchNarrationAudio, pickBrowserVoice } from "./flowNarration.js";

export function Inline({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="dx-code-inline">{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  });
}

export function Diagram({ id, active = [], animate = true }) {
  const spec = DIAGRAMS[id];
  return spec ? <DiagramSvg id={id} spec={spec} active={active} animate={animate} /> : null;
}

export function FlowPlayer({ id }) {
  const flow = FLOWS[id];
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState("idle");
  const [showTranscript, setShowTranscript] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [playToken, setPlayToken] = useState(0);
  const [statusNote, setStatusNote] = useState("");
  const figureRef = useRef(null);
  const audioRef = useRef(null);
  const objectUrlRef = useRef("");
  const utteranceRef = useRef(null);
  const abortRef = useRef(null);
  const timerRef = useRef(0);
  const timerRemainingRef = useRef(0);
  const timerDueRef = useRef(0);
  const runRef = useRef(0);
  const autoAdvanceRef = useRef(false);
  const modeRef = useRef("idle");
  const last = flow.steps.length - 1;
  const current = flow.steps[step];

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const stopTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = 0;
    timerDueRef.current = 0;
  }, []);

  const revokeAudioUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = "";
    }
  }, []);

  const stopPlayback = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    stopTimer();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    revokeAudioUrl();
  }, [revokeAudioUrl, stopTimer]);

  const restartCurrent = useCallback((nextMode = "loading") => {
    stopPlayback();
    setMode(nextMode);
    setPlayToken((value) => value + 1);
  }, [stopPlayback]);

  const completeStep = useCallback((runId) => {
    if (runId !== runRef.current) return;
    if (!autoAdvanceRef.current || step >= last) {
      autoAdvanceRef.current = false;
      setMode("idle");
      return;
    }
    setStep((value) => {
      const next = Math.min(last, value + 1);
      return next;
    });
    setMode("loading");
    setPlayToken((value) => value + 1);
  }, [last, step]);

  const scheduleTimer = useCallback((ms, runId) => {
    stopTimer();
    const delay = Math.max(350, ms);
    timerRemainingRef.current = delay;
    timerDueRef.current = performance.now() + delay;
    timerRef.current = window.setTimeout(() => completeStep(runId), delay);
  }, [completeStep, stopTimer]);

  const pausePlayback = useCallback(() => {
    if (modeRef.current !== "playing" && modeRef.current !== "loading") return;
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) audioRef.current.pause();
    else if (utteranceRef.current && "speechSynthesis" in window) window.speechSynthesis.pause();
    else if (timerRef.current) {
      timerRemainingRef.current = Math.max(350, timerDueRef.current - performance.now());
      stopTimer();
    }
    setMode("paused");
  }, [stopTimer]);

  const resumePlayback = useCallback(() => {
    autoAdvanceRef.current = true;
    if (audioRef.current) {
      audioRef.current.play().then(() => setMode("playing")).catch(() => restartCurrent("loading"));
      return;
    }
    if (utteranceRef.current && "speechSynthesis" in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setMode("playing");
      return;
    }
    if (timerRemainingRef.current > 0) {
      scheduleTimer(timerRemainingRef.current, runRef.current);
      setMode("playing");
      return;
    }
    restartCurrent("loading");
  }, [restartCurrent, scheduleTimer]);

  const startPlayback = useCallback((fromStart = false) => {
    autoAdvanceRef.current = true;
    if (fromStart) setStep(0);
    restartCurrent("loading");
  }, [restartCurrent]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    if (playToken === 0 || mode !== "loading") return undefined;
    const runId = runRef.current + 1;
    runRef.current = runId;
    const stepData = flow.steps[step];
    const narration = stepData.narration || stepData.d || stepData.t;
    const minDuration = Math.max(1200, Math.min(2600, estimateNarrationMs(narration, speed) * 0.45));
    const startedAt = performance.now();
    const controller = new AbortController();
    abortRef.current = controller;
    async function play() {
      setStatusNote("");
      if (muted) {
        setStatusNote("Muted — stepping on quiet timers.");
        setMode("playing");
        scheduleTimer(estimateNarrationMs(narration, speed), runId);
        return;
      }

      try {
        const { blob } = await fetchNarrationAudio({
          text: narration,
          voice: DOCS_NARRATION_VOICE,
          model: DOCS_NARRATION_MODEL,
          signal: controller.signal,
        });
        if (runId !== runRef.current) return;
        const url = URL.createObjectURL(blob);
        revokeAudioUrl();
        objectUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.preload = "auto";
        audio.playbackRate = speed;
        audio.muted = muted;
        audio.onended = () => {
          const elapsed = performance.now() - startedAt;
          const remaining = Math.max(0, minDuration - elapsed);
          if (remaining > 0) scheduleTimer(remaining, runId);
          else completeStep(runId);
        };
        audio.onerror = () => {
          audioRef.current = null;
          setStatusNote("AI voice unavailable — using your device voice.");
          const utterance = new SpeechSynthesisUtterance(narration);
          const voice = pickBrowserVoice();
          if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang || "en-US";
          } else {
            utterance.lang = "en-US";
          }
          utterance.rate = speed;
          utterance.onend = () => {
            const elapsed = performance.now() - startedAt;
            const remaining = Math.max(0, minDuration - elapsed);
            if (remaining > 0) scheduleTimer(remaining, runId);
            else completeStep(runId);
          };
          utterance.onerror = () => {
            utteranceRef.current = null;
            setStatusNote("AI voice unavailable — stepping with timers.");
            scheduleTimer(estimateNarrationMs(narration, speed), runId);
          };
          utteranceRef.current = utterance;
          if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
            setMode("playing");
          } else {
            setStatusNote("Device voice is unavailable — stepping with timers.");
            scheduleTimer(estimateNarrationMs(narration, speed), runId);
            setMode("playing");
          }
        };
        await audio.play();
        if (runId === runRef.current) setMode("playing");
      } catch (error) {
        if (error?.name === "AbortError" || runId !== runRef.current) return;
        if ("speechSynthesis" in window && !muted) {
          setStatusNote("AI voice unavailable — using your device voice.");
          const utterance = new SpeechSynthesisUtterance(narration);
          const voice = pickBrowserVoice();
          if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang || "en-US";
          } else {
            utterance.lang = "en-US";
          }
          utterance.rate = speed;
          utterance.onend = () => {
            const elapsed = performance.now() - startedAt;
            const remaining = Math.max(0, minDuration - elapsed);
            if (remaining > 0) scheduleTimer(remaining, runId);
            else completeStep(runId);
          };
          utterance.onerror = () => {
            utteranceRef.current = null;
            setStatusNote("Device voice is unavailable — stepping with timers.");
            scheduleTimer(estimateNarrationMs(narration, speed), runId);
          };
          utteranceRef.current = utterance;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
          setMode("playing");
          return;
        }
        setStatusNote("Voice is unavailable — stepping with timers.");
        setMode("playing");
        scheduleTimer(estimateNarrationMs(narration, speed), runId);
      }
    }

    void play();
    return () => {
      controller.abort();
    };
  }, [completeStep, flow.steps, mode, muted, playToken, revokeAudioUrl, scheduleTimer, speed, step]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) pausePlayback();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [pausePlayback]);

  useEffect(() => {
    const node = figureRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || entry.intersectionRatio < 0.45) pausePlayback();
    }, { threshold: [0, 0.45, 0.8] });
    observer.observe(node);
    return () => observer.disconnect();
  }, [pausePlayback]);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  return (
    <figure className="dx-flow" ref={figureRef}>
      <figcaption>{flow.title}</figcaption>
      <Diagram id={flow.diagram} active={current.on} animate={mode === "playing" || mode === "loading"} />
      <div className="dx-flow-ctl">
        <button type="button" onClick={() => { stopPlayback(); const next = Math.max(0, step - 1); setStep(next); if (autoAdvanceRef.current && next !== step) restartCurrent("loading"); else setMode("idle"); }} disabled={step === 0} aria-label="Previous step"><ChevronLeft size={16} /></button>
        <button
          type="button"
          className="play"
          onClick={() => {
            if (mode === "playing" || mode === "loading") pausePlayback();
            else if (mode === "paused") resumePlayback();
            else startPlayback(step >= last);
          }}
          aria-label={mode === "paused" ? "Resume" : mode === "playing" || mode === "loading" ? "Pause" : "Play"}
        >
          {mode === "loading" ? <LoaderCircle size={15} className="spin" /> : mode === "playing" ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button type="button" onClick={() => { stopPlayback(); const next = Math.min(last, step + 1); setStep(next); if (autoAdvanceRef.current && next !== step) restartCurrent("loading"); else setMode("idle"); }} disabled={step === last} aria-label="Next step"><ChevronRight size={16} /></button>
        <button type="button" onClick={() => { autoAdvanceRef.current = true; setStep(0); restartCurrent("loading"); }} aria-label="Replay"><RotateCcw size={15} /></button>
        <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted} aria-label={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>
        <button type="button" onClick={() => setShowTranscript((value) => !value)} aria-pressed={showTranscript} aria-label={showTranscript ? "Hide transcript" : "Show transcript"}><Captions size={15} /></button>
        <div className="dx-dots">{flow.steps.map((_, i) => <i key={i} className={i === step ? "on" : i < step ? "done" : ""} />)}</div>
      </div>
      <div className="dx-flow-meta">
        <span className="dx-flow-count">Step {step + 1} of {flow.steps.length}</span>
        <div className="dx-flow-speed" role="group" aria-label="Narration speed">
          {[0.75, 1, 1.25, 1.5].map((value) => (
            <button key={value} type="button" className={speed === value ? "on" : ""} onClick={() => setSpeed(value)}>{value}×</button>
          ))}
        </div>
      </div>
      {statusNote && <p className="dx-flow-note">{statusNote}</p>}
      {showTranscript && (
        <div className="dx-flow-transcript" key={`${id}-${step}`}>
          <span>Transcript</span>
          <h4>{current.t}</h4>
          <p>{current.narration || current.d}</p>
        </div>
      )}
    </figure>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function StreakDemo() {
  const [days, setDays] = useState([true, true, false, false, false, false, false]);
  let best = 0;
  let run = 0;
  for (const d of days) { run = d ? run + 1 : 0; best = Math.max(best, run); }
  return (
    <div className="dx-demo">
      <p className="dx-demo-hint">Tap days to mark them as “read”.</p>
      <div className="dx-days">
        {DAYS.map((d, i) => (
          <button key={d} type="button" className={days[i] ? "on" : ""} onClick={() => setDays(days.map((v, j) => (j === i ? !v : v)))}>{d}</button>
        ))}
      </div>
      <p className="dx-demo-out">Streak: <b>{best}</b> day{best === 1 ? "" : "s"}{best >= 7 ? " · weekly goal reached" : ""}</p>
    </div>
  );
}

const STAGES = ["Queued", "Sent", "Seen", "In review", "Approved", "In progress", "Testing", "Done"];
function StatusDemo() {
  const [at, setAt] = useState(2);
  return (
    <div className="dx-demo">
      <p className="dx-demo-hint">Move the report forward. “Done” stays grey until it is really reached.</p>
      <ol className="dx-stages">
        {STAGES.map((s, i) => <li key={s} className={i < at ? "past" : i === at ? "now" : ""}><i />{s}</li>)}
      </ol>
      <div className="dx-demo-row">
        <button type="button" onClick={() => setAt(Math.max(0, at - 1))}>Back</button>
        <button type="button" onClick={() => setAt(Math.min(STAGES.length - 1, at + 1))}>Next status</button>
      </div>
    </div>
  );
}

function FallbackDemo() {
  const [groqDown, setGroqDown] = useState(false);
  const [cfDown, setCfDown] = useState(false);
  const who = !groqDown ? "Groq answers (live AI)" : !cfDown ? "Cloudflare answers (backup AI)" : "Predefined guide answer";
  return (
    <div className="dx-demo">
      <p className="dx-demo-hint">Pretend a provider is down and see who answers.</p>
      <div className="dx-demo-row">
        <label><input type="checkbox" checked={groqDown} onChange={(e) => setGroqDown(e.target.checked)} /> Groq is down</label>
        <label><input type="checkbox" checked={cfDown} onChange={(e) => setCfDown(e.target.checked)} /> Cloudflare is down</label>
      </div>
      <p className="dx-demo-out">→ <b>{who}</b></p>
    </div>
  );
}

function ReminderDemo() {
  const [time, setTime] = useState("21:00");
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m - 15) % 1440) + 1440) % 1440;
  const out = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  return (
    <div className="dx-demo">
      <p className="dx-demo-hint">You usually start reading at:</p>
      <input type="time" value={time} onChange={(e) => e.target.value && setTime(e.target.value)} className="dx-time" />
      <p className="dx-demo-out">Reminder arrives at <b>{out}</b> (15 minutes earlier)</p>
    </div>
  );
}

function BackStackDemo() {
  const [stack, setStack] = useState(["Profile"]);
  const next = ["About", "Docs", "Docs page", "Search"][stack.length - 1];
  return (
    <div className="dx-demo">
      <p className="dx-demo-hint">Each screen or panel you open is one layer. Back removes exactly one.</p>
      <div className="dx-stack">
        {stack.map((s, i) => <span key={`${s}${i}`} className={i === stack.length - 1 ? "top" : ""}>{s}</span>)}
      </div>
      <div className="dx-demo-row">
        <button type="button" disabled={!next} onClick={() => setStack([...stack, next])}>Open {next || "—"}</button>
        <button type="button" disabled={stack.length < 2} onClick={() => setStack(stack.slice(0, -1))}>Back</button>
      </div>
    </div>
  );
}

const DEMOS = { streak: StreakDemo, status: StatusDemo, fallback: FallbackDemo, reminder: ReminderDemo, backstack: BackStackDemo };

function CodeBlock({ text }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className="dx-codeblock">
      <button type="button" aria-label="Copy" onClick={() => { navigator.clipboard?.writeText(text).then(() => { setCopied(true); timer.current = setTimeout(() => setCopied(false), 1400); }).catch(() => {}); }}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <pre><code>{text}</code></pre>
    </div>
  );
}

const CALLOUT_ICON = { tip: Lightbulb, warn: AlertTriangle, info: Info, confirm: HelpCircle };

export function Block({ block }) {
  switch (block.type) {
    case "p": return <p><Inline text={block.text} /></p>;
    case "h2": return <h2 id={slugify(block.text)}>{block.text}</h2>;
    case "h3": return <h3>{block.text}</h3>;
    case "ul": return <ul>{block.items.map((it, i) => <li key={i}><Inline text={it} /></li>)}</ul>;
    case "ol": return <ol>{block.items.map((it, i) => <li key={i}><Inline text={it} /></li>)}</ol>;
    case "callout": {
      const Icon = CALLOUT_ICON[block.kind] || Info;
      return (
        <aside className={`dx-callout ${block.kind}`}>
          <Icon size={16} aria-hidden="true" />
          <div><Inline text={block.kind === "confirm" ? `**TO CONFIRM:** ${block.text}` : block.text} /></div>
        </aside>
      );
    }
    case "code": return <CodeBlock text={block.text} />;
    case "table":
      return (
        <div className="dx-table-wrap">
          <table>
            <thead><tr>{block.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{block.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} data-label={block.head[j]}><Inline text={c} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case "diagram": return <figure className="dx-flow"><figcaption>{block.caption}</figcaption><Diagram id={block.id} /></figure>;
    case "flow": return <FlowPlayer id={block.id} />;
    case "demo": { const Demo = DEMOS[block.id]; return <figure className="dx-demo-wrap"><figcaption>{block.caption}</figcaption><Demo /></figure>; }
    case "anim": return <div className="dx-anim"><HelpAnimations ids={block.ids} /></div>;
    default: return null;
  }
}
