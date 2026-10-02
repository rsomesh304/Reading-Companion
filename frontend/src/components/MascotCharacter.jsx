import { useEffect, useId, useRef, useState } from "react";
import "./MascotCharacter.css";
import { makeLocalLine } from "../mascotLines.js";

const CHARACTERS = ["owl", "robot", "sprout", "fox", "book"];
// where each mascot's mouth sits (percent of the drawing)
const MOUTH = {
  owl: { x: 50, y: 65, w: 10 },
  robot: { x: 50, y: 65, w: 12 },
  sprout: { x: 50, y: 63, w: 10 },
  fox: { x: 50, y: 74, w: 10 },
  book: { x: 50, y: 54, w: 10 },
};

export default function MascotCharacter({ characterId = "owl", size = 80, animated = true, context = "the app", bubblePosition = "below", silent = false, onTap, talking = false, levelRef = null }) {
  const uid = useId().replace(/:/g, "");
  if (!CHARACTERS.includes(characterId)) characterId = "owl";

  const [caption, setCaption] = useState(null);
  const [reacting, setReacting] = useState(false);
  const timeoutRef = useRef(null);
  const mouthRef = useRef(null);

  useEffect(() => {
    if (!talking || !levelRef) return;
    let raf;
    const loop = () => {
      const l = levelRef.current || 0;
      if (mouthRef.current) mouthRef.current.style.transform = `translate(-50%, -50%) scaleY(${(0.25 + l * 1.4).toFixed(2)})`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [talking, levelRef]);

  function speak() {
    if (!animated) return;
    if (silent) { onTap?.(); return; }
    const line = makeLocalLine({}, context);
    setCaption(line);
    setReacting(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => { setCaption(null); setReacting(false); }, 9000);
  }

  useEffect(() => {
    if (!animated || silent) return;
    const t = setTimeout(speak, 500 + Math.random() * 900);
    return () => { clearTimeout(t); clearTimeout(timeoutRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId, context]);

  const m = MOUTH[characterId];

  return (
    <div
      className={animated ? "mascot render-3d" : "mascot"}
      style={{ width: size, height: size }}
      onClick={speak}
      role={animated ? "button" : undefined}
      tabIndex={animated ? 0 : undefined}
      aria-label={animated ? "Tap for another thought" : undefined}
    >
      {caption && (
        <div key={caption} className={`mascot-thought-wrap ${bubblePosition}`}>
          <span className="mascot-thought-dot dot-1" />
          <span className="mascot-thought-dot dot-2" />
          <div className="mascot-thought-cloud">{caption}</div>
        </div>
      )}
      <div className={`mascot-inner ${reacting ? "wiggle" : ""}`}>
        {characterId === "owl" && <OwlSVG uid={uid} animated={animated} />}
        {characterId === "robot" && <RobotSVG uid={uid} animated={animated} />}
        {characterId === "sprout" && <SproutSVG uid={uid} animated={animated} />}
        {characterId === "fox" && <FoxSVG uid={uid} animated={animated} />}
        {characterId === "book" && <BookSVG uid={uid} animated={animated} />}
        <span
          ref={mouthRef}
          className={`mascot-mouth ${talking ? "on" : ""} ${talking && !levelRef ? "css-talk" : ""}`}
          style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.w}%`, height: `${m.w * 0.85}%` }}
        />
      </div>
    </div>
  );
}

function OwlSVG({ uid, animated }) {
  const head = `catHead-${uid}`;
  const ear = `catEar-${uid}`;
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <radialGradient id={head} cx="35%" cy="35%" r="70%"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#b45309" /></radialGradient>
        <radialGradient id={ear} cx="50%" cy="30%" r="70%"><stop offset="0%" stopColor="#fde68a" /><stop offset="100%" stopColor="#d97706" /></radialGradient>
      </defs>
      <path d="M25 35 L15 15 L38 28 Z" fill={`url(#${head})`} />
      <path d="M28 32 L20 18 L34 26 Z" fill={`url(#${ear})`} />
      <path d="M75 35 L85 15 L62 28 Z" fill={`url(#${head})`} />
      <path d="M72 32 L80 18 L66 26 Z" fill={`url(#${ear})`} />
      <circle cx="50" cy="55" r="32" fill={`url(#${head})`} />
      <circle cx="35" cy="62" r="10" fill="#fef3c7" opacity="0.6" />
      <circle cx="65" cy="62" r="10" fill="#fef3c7" opacity="0.6" />
      <g className={animated ? "blink-group" : ""}>
        <circle cx="38" cy="50" r="6" fill="#1e1b4b" /><circle cx="40" cy="48" r="2" fill="#fff" />
        <circle cx="62" cy="50" r="6" fill="#1e1b4b" /><circle cx="64" cy="48" r="2" fill="#fff" />
      </g>
      <polygon points="47,58 53,58 50,62" fill="#78350f" />
      <path d="M46 64 Q 50 68 54 64" fill="none" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="38" cy="50" r="12" fill="none" stroke="#e0e7ff" strokeWidth="2.5" />
      <circle cx="62" cy="50" r="12" fill="none" stroke="#e0e7ff" strokeWidth="2.5" />
      <line x1="50" y1="50" x2="50" y2="48" stroke="#e0e7ff" strokeWidth="2.5" />
    </svg>
  );
}

function RobotSVG({ uid, animated }) {
  const body = `botBody-${uid}`;
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <defs><linearGradient id={body} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#0369a1" /></linearGradient></defs>
      <line x1="50" y1="32" x2="50" y2="15" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="12" r="5" fill="#38bdf8" />
      <rect x="25" y="30" width="50" height="46" rx="16" fill={`url(#${body})`} />
      <rect x="32" y="38" width="36" height="22" rx="8" fill="#0f172a" />
      <g className={animated ? "blink-group" : ""}>
        <circle cx="43" cy="49" r="4" fill="#38bdf8" /><circle cx="57" cy="49" r="4" fill="#38bdf8" />
      </g>
      <line x1="46" y1="65" x2="54" y2="65" stroke="#bae6fd" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function SproutSVG({ uid, animated }) {
  const body = `sproutBody-${uid}`;
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <defs><radialGradient id={body} cx="30%" cy="30%" r="70%"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#065f46" /></radialGradient></defs>
      <path d="M50 28 Q 62 10 70 20 Q 70 35 50 32 Z" fill="#10b981" />
      <path d="M50 32 Q 38 12 30 20 Q 30 35 50 32 Z" fill="#059669" />
      <line x1="50" y1="32" x2="50" y2="20" stroke="#047857" strokeWidth="2" />
      <circle cx="50" cy="60" r="28" fill={`url(#${body})`} />
      <circle cx="37" cy="65" r="6" fill="#a7f3d0" opacity="0.5" />
      <circle cx="63" cy="65" r="6" fill="#a7f3d0" opacity="0.5" />
      <g className={animated ? "blink-group" : ""}>
        <circle cx="41" cy="55" r="4" fill="#022c22" /><circle cx="59" cy="55" r="4" fill="#022c22" />
      </g>
      <path d="M48 62 Q 50 65 52 62" fill="none" stroke="#022c22" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FoxSVG({ uid, animated }) {
  const face = `foxFace-${uid}`;
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <defs><radialGradient id={face} cx="35%" cy="35%" r="70%"><stop offset="0%" stopColor="#fb923c" /><stop offset="100%" stopColor="#c2410c" /></radialGradient></defs>
      <path d="M26 36 L18 14 L40 28 Z" fill={`url(#${face})`} />
      <path d="M74 36 L82 14 L60 28 Z" fill={`url(#${face})`} />
      <circle cx="50" cy="56" r="30" fill={`url(#${face})`} />
      <path d="M35 60 L50 82 L65 60 Z" fill="#fff" opacity="0.9" />
      <g className={animated ? "blink-group" : ""}>
        <circle cx="39" cy="48" r="5" fill="#431407" /><circle cx="61" cy="48" r="5" fill="#431407" />
      </g>
      <polygon points="47,66 53,66 50,71" fill="#431407" />
    </svg>
  );
}

function BookSVG({ uid, animated }) {
  const cover = `bookCover-${uid}`;
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <defs><linearGradient id={cover} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a855f7" /><stop offset="100%" stopColor="#6b21a8" /></linearGradient></defs>
      <path d="M20 30 Q 50 20 80 30 L80 75 Q 50 65 20 75 Z" fill="#f3e8ff" />
      <line x1="50" y1="23" x2="50" y2="70" stroke="#d8b4fe" strokeWidth="2" />
      <rect x="16" y="25" width="68" height="52" rx="6" fill={`url(#${cover})`} opacity="0.3" />
      <g className={animated ? "blink-group" : ""}>
        <circle cx="38" cy="44" r="4.5" fill="#581c87" /><circle cx="62" cy="44" r="4.5" fill="#581c87" />
      </g>
      <path d="M47 52 Q 50 56 53 52" fill="none" stroke="#581c87" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}