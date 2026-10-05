import { AnimatePresence, motion as Motion } from "framer-motion";
import { BookOpen, Brain, CalendarDays, Camera, Check, ChevronRight, Flame, Gem, Languages, MessageCircleMore, Play, RotateCcw, Smartphone, Sparkles, UserRound, Zap } from "lucide-react";
import { useEffect, useState } from "react";

const LOOP = { repeat: Infinity, ease: "easeInOut" };

function ReadScene() {
  const widths = [88, 100, 72, 96, 60, 92];
  return (
    <div className="sc-read">
      <div className="sc-page">
        {widths.map((w, i) => <span key={i} className={`sc-line ${i === 2 ? "hot" : ""}`} style={{ width: `${w}%` }} />)}
        <Motion.i className="sc-scan" animate={{ top: ["6%", "90%", "6%"] }} transition={{ ...LOOP, duration: 3.4 }} />
        <Motion.b className="sc-spot" animate={{ scale: [1, 1.15, 1], opacity: [0.75, 1, 0.75] }} transition={{ ...LOOP, duration: 1.6 }}>ephemeral</Motion.b>
      </div>
      <div className="sc-wave">
        {Array.from({ length: 11 }, (_, i) => (
          <Motion.span key={i} animate={{ scaleY: [0.25, 1, 0.35, 0.8, 0.25] }}
            transition={{ ...LOOP, duration: 1.3 + (i % 4) * 0.15, delay: i * 0.08 }} />
        ))}
      </div>
    </div>
  );
}

function VocabScene() {
  const T = { duration: 5.4, repeat: Infinity, ease: "easeInOut" };
  return (
    <div className="sc-vocab">
      <Motion.div className="sc-word"
        animate={{ opacity: [0, 1, 1, 1, 0], scale: [0.3, 1.08, 1, 1, 0.25], y: [0, 0, 0, 0, 130] }}
        transition={{ ...T, times: [0, 0.14, 0.4, 0.72, 1] }}>ephemeral</Motion.div>
      <Motion.div className="sc-mean hi"
        animate={{ opacity: [0, 0, 1, 1, 0], y: [14, 14, 0, 0, 110], scale: [0.9, 0.9, 1, 1, 0.3] }}
        transition={{ ...T, times: [0, 0.14, 0.4, 0.72, 1] }}>Hindi · kshanika</Motion.div>
      <Motion.div className="sc-dict"
        animate={{ scale: [1, 1, 1.16, 1] }} transition={{ ...T, times: [0, 0.74, 0.9, 1] }}>
        <BookOpen size={24} />
      </Motion.div>
    </div>
  );
}

function GemScene() {
  return (
    <div className="sc-gem">
      <Motion.div className="sc-card back" style={{ x: -56 }}
        animate={{ rotate: [-9, -6, -9], y: [0, -4, 0] }} transition={{ ...LOOP, duration: 5 }} />
      <Motion.div className="sc-card front" style={{ x: 22 }}
        animate={{ y: [0, -8, 0], rotate: [3, 1, 3] }} transition={{ ...LOOP, duration: 4.5 }}>
        <span className="sc-card-kicker">YOUR BOOK</span>
        <p>“Chhota kadam, roz. Bas yahi jeet hai.”</p>
        <Motion.i className="sc-shine" style={{ skewX: -18 }}
          animate={{ x: ["-160%", "320%"] }} transition={{ ...LOOP, duration: 2.4, repeatDelay: 1.4 }} />
      </Motion.div>
      <Motion.div className="sc-badge"
        animate={{ scale: [0.8, 1, 1, 0.8], opacity: [0, 1, 1, 0] }} transition={{ ...LOOP, duration: 4.5, times: [0, 0.2, 0.8, 1] }}>
        <Sparkles size={11} /> Poster ready
      </Motion.div>
    </div>
  );
}

const GEMS = [[68, 52], [236, 48], [44, 150], [250, 160], [142, 208]];
function MindScene() {
  return (
    <svg viewBox="0 0 300 240" className="sc-mind">
      {GEMS.map(([x, y], i) => (
        <Motion.line key={`l${i}`} x1="150" y1="115" x2={x} y2={y} stroke="rgba(130,150,255,.75)" strokeWidth="1.6"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: 0.5 + i * 0.35, duration: 0.6 }} />
      ))}
      <Motion.path d="M236 48 Q 292 105 250 160" fill="none" stroke="#f472b6" strokeWidth="1.6" strokeDasharray="3 4"
        initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: 2.6, duration: 0.9 }} />
      <Motion.circle cx="150" cy="115" fill="#8b5cf6" initial={{ r: 0 }} animate={{ r: 17 }} transition={{ type: "spring", stiffness: 200, damping: 12 }} className="g" />
      <Motion.circle cx="150" cy="115" fill="none" stroke="#8b5cf6" strokeWidth="1.5"
        animate={{ r: [17, 34], opacity: [0.7, 0] }} transition={{ repeat: Infinity, duration: 2.2, ease: "easeOut" }} />
      <text x="150" y="120" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff" fontFamily="Fraunces, serif">B</text>
      {GEMS.map(([x, y], i) => (
        <g key={`n${i}`}>
          <Motion.circle cx={x} cy={y} fill="#22d3ee" className="g" initial={{ r: 0 }} animate={{ r: 7 }}
            transition={{ delay: 0.9 + i * 0.35, type: "spring", stiffness: 260, damping: 12 }} />
          <Motion.circle cx={x} cy={y} fill="none" stroke="#22d3ee" strokeWidth="1"
            animate={{ r: [7, 15], opacity: [0.6, 0] }} transition={{ repeat: Infinity, duration: 2.4, delay: 1.5 + i * 0.3, ease: "easeOut" }} />
        </g>
      ))}
    </svg>
  );
}

function TrackScene() {
  const rows = [
    { Icon: BookOpen, a: "Chapter 7", b: "Pg 112 – 138", pct: 72 },
    { Icon: Gem, a: "12 words saved", b: "is hafte", pct: 48 },
    { Icon: Check, a: "Yaad rakha", b: "short explanations pasand", pct: 100 },
  ];
  return (
    <div className="sc-track">
      {rows.map(({ Icon, a, b, pct }, i) => (
        <Motion.div key={a} className="sc-row" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.35, type: "spring", stiffness: 160, damping: 16 }}>
          <span className="sc-row-ic"><Icon size={15} /></span>
          <span className="sc-row-main">
            <b>{a}</b>
            <span className="sc-bar"><Motion.i initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.5 + i * 0.35, duration: 1.1, ease: "easeOut" }} /></span>
            <small>{b}</small>
          </span>
        </Motion.div>
      ))}
    </div>
  );
}

function WhyScene() {
  const T = { duration: 3.4, repeat: Infinity, ease: "easeInOut" };
  return (
    <div className="sc-why">
      <div className="sc-page">
        {[90, 100, 66, 96, 74].map((w, i) => <span key={i} className={`sc-line ${i === 2 ? "hot" : ""}`} style={{ width: `${w}%` }} />)}
        <Motion.span className="sc-stuck"
          animate={{ x: [0, -5, 5, -4, 4, 0, 0], opacity: [1, 1, 1, 1, 1, 0, 0] }} transition={{ ...T, times: [0, 0.08, 0.16, 0.24, 0.32, 0.5, 1] }}>ephemeral ?</Motion.span>
        <Motion.span className="sc-solved"
          animate={{ opacity: [0, 0, 1, 1, 0], scale: [0.8, 0.8, 1, 1, 0.8] }} transition={{ ...T, times: [0, 0.45, 0.6, 0.9, 1] }}><Check size={12} /> Matlab mil gaya</Motion.span>
      </div>
    </div>
  );
}

function BrandScene() {
  const rays = Array.from({ length: 11 }, (_, i) => {
    const a = Math.PI + (i / 10) * Math.PI;
    return [150 + Math.cos(a) * 46, 100 + Math.sin(a) * 46, 150 + Math.cos(a) * 104, 100 + Math.sin(a) * 104];
  });
  return (
    <svg viewBox="0 0 300 240" className="sc-svg">
      <defs>
        <linearGradient id="bkg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8b5cf6" /><stop offset="1" stopColor="#22d3ee" /></linearGradient>
        <radialGradient id="orbg"><stop offset="0" stopColor="#fff3ce" /><stop offset=".5" stopColor="#f59e0b" /><stop offset="1" stopColor="#ef4444" /></radialGradient>
      </defs>
      {rays.map(([x1, y1, x2, y2], i) => (
        <Motion.line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round"
          initial={{ opacity: 0 }} animate={{ opacity: [0, 0.8, 0.25, 0.8] }} transition={{ delay: 1.6 + i * 0.07, duration: 2.4, repeat: Infinity }} />
      ))}
      <Motion.path d="M150 150 C120 138 80 138 40 150 L40 206 C80 194 120 194 150 208 Z" fill="rgba(139,92,246,.14)" stroke="url(#bkg)" strokeWidth="2.5"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
      <Motion.path d="M150 150 C180 138 220 138 260 150 L260 206 C220 194 180 194 150 208 Z" fill="rgba(34,211,238,.14)" stroke="url(#bkg)" strokeWidth="2.5"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
      {[162, 174, 186].map((y, i) => (
        <g key={y}>
          <Motion.line x1="62" y1={y - i} x2="132" y2={y + 2 - i} stroke="rgba(139,92,246,.5)" strokeWidth="2" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.8 + i * 0.15 }} />
          <Motion.line x1="168" y1={y + 2 - i} x2="238" y2={y - i} stroke="rgba(34,211,238,.5)" strokeWidth="2" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.8 + i * 0.15 }} />
        </g>
      ))}
      <Motion.circle cx="150" fill="rgba(245,158,11,.25)" initial={{ cy: 150, r: 0 }} animate={{ cy: 94, r: [0, 40, 34] }} transition={{ delay: 0.9, duration: 1.4 }} />
      <Motion.circle cx="150" fill="url(#orbg)" initial={{ cy: 150, r: 0 }} animate={{ cy: 94, r: 20 }} transition={{ delay: 0.9, duration: 1.2, type: "spring", stiffness: 90, damping: 12 }} />
      <Motion.text x="150" y="232" textAnchor="middle" fontSize="15" fontWeight="600" fontFamily="Fraunces, serif" style={{ fill: "var(--text)" }}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8 }}>Reading Companion</Motion.text>
    </svg>
  );
}

const WHO = [["Student", 150, 30, "middle", -12], ["Job", 254, 84, "end", -12], ["Reader", 236, 196, "end", 20], ["English books", 150, 222, "middle", -12], ["Hindi", 64, 196, "start", 20], ["Odia", 46, 84, "start", -12]];
function WhoScene() {
  return (
    <svg viewBox="0 0 300 240" className="sc-svg">
      {WHO.map(([l, x, y], i) => (
        <Motion.line key={`l${l}`} x1="150" y1="120" x2={x} y2={y} stroke="rgba(130,150,255,.7)" strokeWidth="1.5" strokeDasharray="4 4"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3 + i * 0.25, duration: 0.6 }} />
      ))}
      <Motion.circle cx="150" cy="120" fill="#8b5cf6" className="g" initial={{ r: 0 }} animate={{ r: 25 }} transition={{ type: "spring", stiffness: 200, damping: 12 }} />
      <Motion.circle cx="150" cy="120" fill="none" stroke="#8b5cf6" animate={{ r: [25, 48], opacity: [0.6, 0] }} transition={{ repeat: Infinity, duration: 2.2 }} />
      <text x="150" y="126" textAnchor="middle" fontSize="16" fontWeight="700" fill="#fff">YOU</text>
      {WHO.map(([l, x, y, anc, dy], i) => (
        <g key={l}>
          <Motion.circle cx={x} cy={y} fill={i < 4 ? "#f59e0b" : "#22d3ee"} className="g" initial={{ r: 0 }} animate={{ r: 7 }} transition={{ delay: 0.6 + i * 0.25, type: "spring", stiffness: 260, damping: 12 }} />
          <Motion.text x={x} y={y + dy} textAnchor={anc} fontSize="12" fontWeight="700" style={{ fill: "var(--text)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 + i * 0.25 }}>{l}</Motion.text>
        </g>
      ))}
    </svg>
  );
}

function BenefitScene() {
  const rows = [
    { Icon: Zap, a: "Turant matlab", b: "Word atka? Bas poochho", pct: 100 },
    { Icon: Languages, a: "Hindi + Odia", b: "Apni bhasha me, example ke saath", pct: 90 },
    { Icon: Brain, a: "Yaad bhi rahe", b: "Words, gems, memory save", pct: 80 },
  ];
  return (
    <div className="sc-track">
      {rows.map(({ Icon, a, b, pct }, i) => (
        <Motion.div key={a} className="sc-row" initial={{ opacity: 0, scale: 0.85, x: 30 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.5, type: "spring", stiffness: 170, damping: 15 }}>
          <span className="sc-row-ic"><Icon size={15} /></span>
          <span className="sc-row-main"><b>{a}</b><span className="sc-bar"><Motion.i initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.5 + i * 0.5, duration: 1 }} /></span><small>{b}</small></span>
        </Motion.div>
      ))}
    </div>
  );
}

function StreakScene() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((v) => (v >= 90 ? 90 : v + 2)), 60);
    return () => clearInterval(id);
  }, []);
  const R = 62, C = 2 * Math.PI * R;
  return (
    <div className="sc-streak">
      <svg viewBox="0 0 160 160" className="sc-streak-ring">
        <defs><linearGradient id="stg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f59e0b" /><stop offset=".6" stopColor="#ef4444" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
        <circle cx="80" cy="80" r={R} fill="none" stroke="rgba(130,130,160,.25)" strokeWidth="9" />
        <circle cx="80" cy="80" r={R} fill="none" stroke="url(#stg)" strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - n / 90)} transform="rotate(-90 80 80)" />
      </svg>
      <div className="sc-streak-num"><Flame size={22} color="#f59e0b" /><b>{n}</b><small>din</small></div>
      <Motion.div className="sc-streak-say" initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: n >= 90 ? 1 : 0, scale: n >= 90 ? 1 : 0.3 }} transition={{ type: "spring", stiffness: 240, damping: 14 }}>
        Ab main bolunga!
      </Motion.div>
    </div>
  );
}

const GOAL_PCT = { "10 min": 17, "20 min": 33, "30 min": 50, "1 hour": 100 };
const READER_CARD_COPY = {
  kicker: "NAYI READING JODI",
  genres: "PASAND KE GENRES",
  goal: "DAILY READING GOAL",
  ready: "Ready",
};

export function ReaderCard({ name, companion, prefs, goal }) {
  const R = 24, C = 2 * Math.PI * R;
  const ini = (s) => (s || "?").trim()[0]?.toUpperCase();
  const pop = (d) => ({ initial: { scale: 0 }, animate: { scale: 1 }, transition: { type: "spring", stiffness: 220, damping: 14, delay: d } });
  const rise = (d) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay: d } });
  const copy = READER_CARD_COPY;
  return (
    <div className="rc-card">
      <Motion.div className="rc-kicker" {...rise(0.1)}>{copy.kicker}</Motion.div>
      <div className="rc-pair">
        <Motion.div className="rc-orb a" {...pop(0.2)}>{ini(name)}</Motion.div>
        <svg className="rc-link" viewBox="0 0 80 20">
          <defs><linearGradient id="rcg"><stop offset="0" stopColor="#8b5cf6" /><stop offset="1" stopColor="#f59e0b" /></linearGradient></defs>
          <Motion.path d="M0 10 Q20 -4 40 10 T80 10" fill="none" stroke="url(#rcg)" strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.8, duration: 0.9 }} />
        </svg>
        <Motion.div className="rc-orb b" {...pop(0.5)}>{ini(companion)}</Motion.div>
      </div>
      <div className="rc-names"><Motion.b {...rise(1.1)}>{name}</Motion.b><span>×</span><Motion.b {...rise(1.4)}>{companion}</Motion.b></div>
      {prefs.length > 0 && (
        <div className="rc-meta">
          <small>{copy.genres}</small>
          <div className="rc-chips">{prefs.map((p, i) => <Motion.span key={p} {...pop(1.8 + i * 0.25)}>{p}</Motion.span>)}</div>
        </div>
      )}
      <Motion.div className="rc-goal" {...rise(2.4)}>
        <svg viewBox="0 0 60 60" width="54" height="54">
          <circle cx="30" cy="30" r={R} fill="none" stroke="rgba(130,130,160,.25)" strokeWidth="6" />
          <Motion.circle cx="30" cy="30" r={R} fill="none" stroke="#8b5cf6" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} transform="rotate(-90 30 30)"
            initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - (GOAL_PCT[goal] ?? 33) / 100) }} transition={{ delay: 2.6, duration: 1.2 }} />
        </svg>
          <span><small>{copy.goal}</small><b>{goal}</b></span>
      </Motion.div>
      <Motion.div className="rc-ready" {...pop(3.4)}><Check size={14} /> {copy.ready}</Motion.div>
    </div>
  );
}

// ===== App intro: a spark of curiosity falls, the book draws itself open,
// understanding rises as an ember, and saved ideas become a constellation =====
const INTRO_CHIPS = ["Word → Matlab", "Quote → Gem", "Page → Yaad"];
const INTRO_NODES = [[150, 12], [201, 49], [182, 110], [118, 110], [99, 49]];
const INTRO_STARS = [[26, 22], [58, 150], [272, 30], [280, 140], [110, 26], [240, 100], [20, 90], [262, 168]];

function IntroScene() {
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return [150 + Math.cos(a) * 20, 66 + Math.sin(a) * 20, 150 + Math.cos(a) * 33, 66 + Math.sin(a) * 33];
  });
  return (
    <div className="sc-intro">
      <svg viewBox="0 0 300 190" className="sci-svg">
        <defs>
          <linearGradient id="sciBk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8b5cf6" /><stop offset="1" stopColor="#22d3ee" /></linearGradient>
          <radialGradient id="sciOrb"><stop offset="0" stopColor="#fff3ce" /><stop offset=".55" stopColor="#f59e0b" /><stop offset="1" stopColor="#ef4444" /></radialGradient>
        </defs>

        {/* idle star field */}
        {INTRO_STARS.map(([x, y], i) => (
          <Motion.circle key={`s${i}`} cx={x} cy={y} r="1.6" fill="#fff"
            animate={{ opacity: [0.15, 0.9, 0.15] }} transition={{ duration: 2 + (i % 3) * 0.5, repeat: Infinity, delay: i * 0.3 }} />
        ))}

        {/* the spark of curiosity falls into the book */}
        <Motion.circle cx="150" r="4.5" fill="#fde68a" style={{ filter: "drop-shadow(0 0 8px rgba(245,158,11,.9))" }}
          initial={{ cy: -12, opacity: 0 }} animate={{ cy: 118, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.05, times: [0, 0.15, 0.85, 1], ease: "easeIn" }} />
        <Motion.circle cx="150" cy="118" fill="none" stroke="#f59e0b" strokeWidth="2"
          initial={{ r: 4, opacity: 0.8 }} animate={{ r: 46, opacity: 0 }}
          transition={{ delay: 1, duration: 0.9, ease: "easeOut" }} />

        {/* the book draws itself open */}
        <Motion.path d="M150 104 C122 92 88 92 52 104 L52 158 C88 146 122 146 150 160 Z" fill="rgba(139,92,246,.14)" stroke="url(#sciBk)" strokeWidth="2.5" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.05, duration: 1.1 }} />
        <Motion.path d="M150 104 C178 92 212 92 248 104 L248 158 C212 146 178 146 150 160 Z" fill="rgba(34,211,238,.14)" stroke="url(#sciBk)" strokeWidth="2.5" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.05, duration: 1.1 }} />
        <Motion.line x1="150" y1="104" x2="150" y2="160" stroke="url(#sciBk)" strokeWidth="2"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.7, duration: 0.5 }} />
        {[114, 126, 138].map((y, i) => (
          <g key={y}>
            <Motion.line x1="70" y1={y} x2="134" y2={y + 3} stroke="rgba(139,92,246,.5)" strokeWidth="2" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 2 + i * 0.14, duration: 0.45 }} />
            <Motion.line x1="166" y1={y + 3} x2="230" y2={y} stroke="rgba(34,211,238,.5)" strokeWidth="2" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 2 + i * 0.14, duration: 0.45 }} />
          </g>
        ))}

        {/* understanding rises out of the pages as an ember */}
        <Motion.circle cx="150" fill="rgba(245,158,11,.28)"
          initial={{ cy: 130, r: 0, opacity: 0 }} animate={{ cy: 66, r: 26, opacity: 1 }}
          transition={{ delay: 2.5, duration: 1.2, ease: "easeOut" }} />
        <Motion.circle cx="150" fill="url(#sciOrb)"
          initial={{ cy: 130, r: 0 }} animate={{ cy: 66, r: 14 }}
          transition={{ delay: 2.5, duration: 1.05, type: "spring", stiffness: 90, damping: 11 }} />
        <Motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ delay: 3.1, duration: 0.6 }}>
          <Motion.g animate={{ rotate: 360 }} transition={{ duration: 26, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "150px 66px" }}>
            {rays.map(([x1, y1, x2, y2], i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round" />
            ))}
          </Motion.g>
        </Motion.g>

        {/* what you save becomes a constellation of ideas */}
        {INTRO_NODES.map(([x, y], i) => (
          <g key={`n${i}`}>
            <Motion.line x1="150" y1="66" x2={x} y2={y} stroke="rgba(130,150,255,.55)" strokeWidth="1.1"
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: 3.4 + i * 0.15, duration: 0.45 }} />
            <Motion.circle cx={x} cy={y} fill={i % 2 ? "#22d3ee" : "#a78bfa"} className="sci-node"
              initial={{ r: 0 }} animate={{ r: 4 }} transition={{ delay: 3.55 + i * 0.15, type: "spring", stiffness: 280, damping: 11 }} />
          </g>
        ))}
      </svg>

      <div className="sci-chips">
        {INTRO_CHIPS.map((w, i) => (
          <Motion.span key={w} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 4.3 + i * 0.28, type: "spring", stiffness: 250, damping: 14 }}>{w}</Motion.span>
        ))}
      </div>
    </div>
  );
}

// ===== Opening scene: the book that stayed on the shelf wakes up =====
function ShelfScene() {
  const spineW = [26, 20, 30, 22, 26, 18];
  const spineH = [86, 96, 80, 92, 84, 90];
  const spineC = ["#5b5570", "#4c4a63", "#6b5a78", "#46455c", "#585670", "#504e66"];
  let x = 18;
  const spines = spineW.map((w, i) => { const s = { x, w, h: spineH[i], c: spineC[i] }; x += w + 6; return s; });
  const hero = spines[2];
  return (
    <svg viewBox="0 0 300 190" className="sci-svg">
      <defs>
        <linearGradient id="shlBk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f59e0b" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient>
        <radialGradient id="shlGlow"><stop offset="0" stopColor="rgba(245,158,11,.55)" /><stop offset="1" stopColor="rgba(245,158,11,0)" /></radialGradient>
      </defs>

      {/* shelf plank */}
      <Motion.rect x="8" y="138" width="284" height="8" rx="3" fill="var(--surface-2, #26273a)" stroke="var(--border, rgba(255,255,255,.12))"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} />

      {/* faded book spines */}
      {spines.map((s, i) => i !== 2 && (
        <Motion.g key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08 }}>
          <rect x={s.x} y={138 - s.h} width={s.w} height={s.h} rx="3" fill={s.c} opacity="0.55" />
          <line x1={s.x + 5} y1={138 - s.h + 10} x2={s.x + s.w - 5} y2={138 - s.h + 10} stroke="rgba(255,255,255,.14)" strokeWidth="1.5" />
          <line x1={s.x + 5} y1={138 - s.h + 16} x2={s.x + s.w - 5} y2={138 - s.h + 16} stroke="rgba(255,255,255,.08)" strokeWidth="1.5" />
        </Motion.g>
      ))}

      {/* dust motes drifting off the shelf */}
      {[0, 1, 2, 3, 4].map((i) => (
        <Motion.circle key={`d${i}`} cx={60 + i * 44} r="1.8" fill="#fbbf24"
          initial={{ cy: 130, opacity: 0 }}
          animate={{ cy: [130, 96 - (i % 3) * 14], opacity: [0, 0.8, 0] }}
          transition={{ delay: 1.4 + i * 0.25, duration: 2.4, repeat: Infinity, repeatDelay: 1.2 }} />
      ))}

      {/* the one book that wakes up: glows, slides out, opens */}
      <Motion.circle cx={hero.x + hero.w / 2} cy="96" r="30" fill="url(#shlGlow)"
        initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0.7] }} transition={{ delay: 1.7, duration: 0.8 }} />
      <Motion.g initial={{ y: 0 }} animate={{ y: -14 }} transition={{ delay: 1.7, duration: 0.55, type: "spring", stiffness: 180, damping: 13 }}>
        <Motion.rect x={hero.x} y={138 - hero.h} width={hero.w} height={hero.h} rx="3" fill="url(#shlBk)"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7, duration: 0.4 }} />
      </Motion.g>

      {/* the opened book rising from the shelf */}
      <Motion.g initial={{ opacity: 0, y: 12, scale: 0.6 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 2.5, duration: 0.6, type: "spring", stiffness: 160, damping: 13 }} style={{ transformOrigin: "150px 60px" }}>
        <path d="M150 42 C134 34 112 34 92 42 L92 78 C112 70 134 70 150 78 Z" fill="rgba(139,92,246,.18)" stroke="url(#shlBk)" strokeWidth="2" strokeLinejoin="round" />
        <path d="M150 42 C166 34 188 34 208 42 L208 78 C188 70 166 70 150 78 Z" fill="rgba(34,211,238,.16)" stroke="url(#shlBk)" strokeWidth="2" strokeLinejoin="round" />
        <line x1="150" y1="42" x2="150" y2="78" stroke="url(#shlBk)" strokeWidth="2" />
      </Motion.g>

      {/* little heart-spark: someone came back for it */}
      <Motion.path d="M150 24 C146 18 138 18 138 25 C138 31 145 34 150 38 C155 34 162 31 162 25 C162 18 154 18 150 24 Z"
        fill="#f472b6" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.2, 1], opacity: 1 }}
        transition={{ delay: 3.1, duration: 0.6, type: "spring", stiffness: 240, damping: 12 }} style={{ transformOrigin: "150px 27px" }} />

      <Motion.text x="150" y="170" textAnchor="middle" fontSize="11.5" fontWeight="700" style={{ fill: "var(--text)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} transition={{ delay: 3.4 }}>Woh kitab ab bhi intezaar kar rahi hai…</Motion.text>
    </svg>
  );
}

// ===== Visual recap scene: the chapter replays like a mini film =====
function RecapScene() {
  const frames = [0, 1, 2, 3, 4, 5];
  const lines = [86, 96, 70, 92, 78];
  return (
    <div className="sc-recap">
      <div className="sc-film">
        {frames.map((i) => (
          <Motion.span key={i} className="sc-frame" animate={{ opacity: [0.25, 0.85, 0.25] }} transition={{ ...LOOP, duration: 1.7, delay: i * 0.22 }} />
        ))}
      </div>
      <div className="sc-screen">
        <Motion.div className="sc-rewind" animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 3.2, ease: "linear" }}>
          <RotateCcw size={15} />
        </Motion.div>
        <div className="sc-page-mini">
          {lines.map((w, i) => (
            <Motion.span key={i} className="sc-line" style={{ width: `${w}%` }}
              animate={{ scaleX: [1, 0.15, 1], opacity: [1, 0.35, 1] }}
              transition={{ ...LOOP, duration: 2.2, delay: i * 0.16 }} />
          ))}
        </div>
        <Motion.span className="sc-chip-r c1" animate={{ y: [0, -8, 0], opacity: [0.7, 1, 0.7] }} transition={{ ...LOOP, duration: 2.4 }}>ephemeral</Motion.span>
        <Motion.span className="sc-chip-r c2" animate={{ y: [0, 7, 0], opacity: [0.7, 1, 0.7] }} transition={{ ...LOOP, duration: 2.8, delay: 0.5 }}>serene</Motion.span>
      </div>
      <Motion.div className="sc-play-big" animate={{ scale: [1, 1.14, 1] }} transition={{ ...LOOP, duration: 1.6 }}>
        <Play size={17} fill="#fff" />
      </Motion.div>
    </div>
  );
}

function WhyCompareScene() {
  return (
    <div className="sc-why-proof sc-why-compare">
      <Motion.div className="sc-ai-provider gemini" initial={{ opacity: 0, x: -28, rotate: -7 }} animate={{ opacity: 1, x: 0, rotate: -4 }} transition={{ type: "spring", stiffness: 150, damping: 16 }}>
        <div className="sc-ai-logo"><img src="/gemini.png" alt="" /></div>
        <b>Gemini Live</b>
        <small>Ask anything</small>
      </Motion.div>
      <Motion.div className="sc-ai-provider chatgpt" initial={{ opacity: 0, x: 28, rotate: 7 }} animate={{ opacity: 1, x: 0, rotate: 4 }} transition={{ delay: .15, type: "spring", stiffness: 150, damping: 16 }}>
        <div className="sc-ai-logo"><img src="/chat-gpt.png" alt="" /></div>
        <b>ChatGPT</b>
        <small>Ask anything</small>
      </Motion.div>
      <svg viewBox="0 0 300 220" className="sc-proof-svg" aria-hidden="true">
        <defs><linearGradient id="waicompare"><stop stopColor="#22d3ee" /><stop offset=".5" stopColor="#a78bfa" /><stop offset="1" stopColor="#f59e0b" /></linearGradient></defs>
        <Motion.path d="M78 118 Q150 158 222 118" fill="none" stroke="url(#waicompare)" strokeWidth="2.5" strokeDasharray="5 5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: .55, duration: .9 }} />
        <Motion.circle cx="150" cy="146" r="7" fill="#fff1c7" animate={{ scale: [1, 1.7, 1], opacity: [.55, 1, .55] }} transition={{ ...LOOP, duration: 2.2 }} />
      </svg>
      <Motion.div className="sc-ai-answer" initial={{ y: 16, opacity: 0, scale: .86 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: .7, type: "spring", stiffness: 180, damping: 16 }}>
        <BookOpen size={15} /><span>Your book</span><b>+</b><span>Your reading history</span>
      </Motion.div>
    </div>
  );
}

function WhyMemoryScene() {
  return (
    <div className="sc-why-proof sc-why-memory">
      <Motion.div className="sc-memory-book" initial={{ rotateY: -28, y: 18 }} animate={{ rotateY: 0, y: [0, -5, 0] }} transition={{ rotateY: { type: "spring", stiffness: 120, damping: 14 }, y: { ...LOOP, duration: 4 } }}>
        <BookOpen size={28} />
        <span>MY BOOK</span>
        <b>Chapter 04</b>
        <small>12 words saved</small>
      </Motion.div>
      <svg viewBox="0 0 300 220" className="sc-proof-svg" aria-hidden="true">
        <defs><linearGradient id="wmemory" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#22d3ee" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
        <Motion.path d="M68 112 C112 44 170 54 220 100" fill="none" stroke="url(#wmemory)" strokeWidth="2" strokeDasharray="5 6" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: .3, duration: 1.1 }} />
        {[[68, 112], [112, 73], [164, 66], [220, 100]].map(([x, y], index) => <Motion.circle key={index} cx={x} cy={y} r="5" fill={index % 2 ? "#22d3ee" : "#a78bfa"} initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ delay: .35 + index * .22, type: "spring", stiffness: 230, damping: 14 }} />)}
      </svg>
      <Motion.span className="sc-memory-chip" initial={{ opacity: 0, scale: .7, x: 18 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ delay: .8, type: "spring", stiffness: 180, damping: 15 }}><Sparkles size={12} /> Saved for later</Motion.span>
    </div>
  );
}

function WhyContinuityScene() {
  return (
    <div className="sc-why-proof sc-why-continuity">
      <svg viewBox="0 0 300 220" className="sc-proof-svg" aria-hidden="true">
        <defs><linearGradient id="wcontinuity"><stop stopColor="#f59e0b" /><stop offset=".55" stopColor="#f472b6" /><stop offset="1" stopColor="#22d3ee" /></linearGradient></defs>
        <Motion.path d="M44 126 C86 52 120 166 157 104 S218 67 256 112" fill="none" stroke="url(#wcontinuity)" strokeWidth="4" strokeLinecap="round" strokeDasharray="330" initial={{ strokeDashoffset: 330 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 1.5, ease: "easeInOut" }} />
        {[44, 112, 177, 256].map((x, index) => <g key={x}><Motion.circle cx={x} cy={index % 2 ? 119 : 126} r="13" fill={index === 3 ? "#22d3ee" : "#8b5cf6"} opacity=".2" animate={{ scale: [1, 1.5, 1] }} transition={{ ...LOOP, duration: 2.3, delay: index * .25 }} /><circle cx={x} cy={index % 2 ? 119 : 126} r="5" fill={index === 3 ? "#22d3ee" : "#c4b5fd"} /></g>)}
        <Motion.circle cx="44" cy="126" r="8" fill="#fbbf24" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], scale: [1, 1.6, 1] }} transition={{ duration: 2.5, repeat: Infinity }} />
      </svg>
      <div className="sc-cont-label yesterday"><small>LAST TIME</small><b>Chapter 4 · p. 82</b></div>
      <div className="sc-cont-label today"><small>NOW</small><b>Pick up here</b></div>
      <Motion.div className="sc-cont-marker" animate={{ x: [0, 94, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}><BookOpen size={13} /></Motion.div>
    </div>
  );
}

function WhyHabitScene() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="sc-why-proof sc-why-habit">
      <Motion.div className="sc-habit-ring" animate={{ rotate: 360 }} transition={{ duration: 24, repeat: Infinity, ease: "linear" }}>
        <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="7" /><Motion.circle cx="60" cy="60" r="48" fill="none" stroke="url(#whabit)" strokeWidth="7" strokeLinecap="round" strokeDasharray="302" initial={{ strokeDashoffset: 302 }} animate={{ strokeDashoffset: 58 }} transition={{ duration: 1.7, ease: "easeOut" }} transform="rotate(-90 60 60)" /><defs><linearGradient id="whabit"><stop stopColor="#f59e0b" /><stop offset="1" stopColor="#f472b6" /></linearGradient></defs></svg>
      </Motion.div>
      <div className="sc-habit-center"><Flame size={19} /><b>6</b><small>DAY STREAK</small></div>
      <div className="sc-habit-week">
        {days.map((day, index) => <Motion.div key={`${day}-${index}`} initial={{ y: 10, opacity: 0, scale: .7 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: .2 + index * .12, type: "spring", stiffness: 240, damping: 15 }}><small>{day}</small><span className={index < 6 ? "read" : ""}>{index < 6 ? <Check size={12} /> : "·"}</span></Motion.div>)}
      </div>
      <Motion.div className="sc-habit-goal" animate={{ y: [0, -3, 0] }} transition={{ ...LOOP, duration: 2.6 }}><CalendarDays size={13} /> Today's goal <b>20 min</b></Motion.div>
    </div>
  );
}

function WhyLanguageScene() {
  return (
    <div className="sc-why-proof sc-why-language">
      <Motion.div className="sc-lang-orb" animate={{ scale: [1, 1.08, 1], boxShadow: ["0 0 18px rgba(139,92,246,.35)", "0 0 42px rgba(34,211,238,.62)", "0 0 18px rgba(139,92,246,.35)"] }} transition={{ ...LOOP, duration: 3.5 }}><Languages size={31} /></Motion.div>
      <Motion.span className="sc-lang-tag en" initial={{ x: -22, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: .2, type: "spring" }}>English · meaning</Motion.span>
      <Motion.span className="sc-lang-tag hi" initial={{ x: 22, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: .5, type: "spring" }}>हिंदी · example</Motion.span>
      <Motion.span className="sc-lang-tag od" initial={{ x: 22, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: .8, type: "spring" }}>ଓଡ଼ିଆ · example</Motion.span>
      <div className="sc-lang-wave">{Array.from({ length: 13 }, (_, index) => <Motion.i key={index} animate={{ scaleY: [.25, .8 + (index % 3) * .2, .25] }} transition={{ ...LOOP, duration: 1.1 + index % 4 * .15, delay: index * .06 }} />)}</div>
      <small className="sc-lang-foot">Bas boliye. Type karna zaroori nahi.</small>
    </div>
  );
}

function WhyApplicationScene() {
  return (
    <div className="sc-why-proof sc-why-apply">
      <Motion.div className="sc-apply-card quote" initial={{ opacity: 0, x: -35, rotate: -7 }} animate={{ opacity: 1, x: -28, rotate: -5 }} transition={{ type: "spring", stiffness: 140, damping: 16 }}><span>GEM</span><b>“A line worth keeping”</b><i /></Motion.div>
      <svg viewBox="0 0 300 220" className="sc-apply-path" aria-hidden="true"><Motion.path d="M100 124 C133 88 164 154 198 115" fill="none" stroke="url(#wapply)" strokeWidth="2.5" strokeDasharray="6 5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: .35, duration: 1.1 }} /></svg>
      <Motion.div className="sc-apply-card steps" initial={{ opacity: 0, x: 34, rotate: 5 }} animate={{ opacity: 1, x: 25, rotate: 4 }} transition={{ delay: .45, type: "spring", stiffness: 140, damping: 16 }}><span><Check size={12} /> TRY IT</span><b>One small step</b><small>Saved with the quote</small></Motion.div>
      <Motion.div className="sc-apply-glow" animate={{ scale: [1, 1.2, 1], opacity: [.4, .8, .4] }} transition={{ ...LOOP, duration: 2.8 }} />
      <svg width="0" height="0" className="sc-defs" aria-hidden="true"><defs><linearGradient id="wapply"><stop stopColor="#f59e0b" /><stop offset="1" stopColor="#22d3ee" /></linearGradient></defs></svg>
    </div>
  );
}

// ===== Snapshot reading: photograph the page once, keep the phone aside, just ask =====
function SnapshotScene() {
  const T = { duration: 7, repeat: Infinity, ease: "easeInOut" };
  const widths = [90, 100, 70, 96, 62];
  return (
    <div className="sc-snap">
      <div className="sc-snap-book">
        <div className="sc-page sc-snap-page">
          {widths.map((w, i) => <span key={i} className={`sc-line ${i === 2 ? "hot" : ""}`} style={{ width: `${w}%` }} />)}
          <Motion.i className="sc-snap-flash" animate={{ opacity: [0, 0, 0.95, 0, 0] }} transition={{ ...T, times: [0, 0.08, 0.14, 0.3, 1] }} />
        </div>
        <Motion.span className="sc-snap-shot" animate={{ opacity: [0, 0, 1, 1, 0], scale: [0.7, 0.7, 1, 1, 0.9] }} transition={{ ...T, times: [0, 0.12, 0.2, 0.8, 1] }}>
          <Camera size={12} /> Snapshot
        </Motion.span>
      </div>

      <Motion.div className="sc-snap-fly" animate={{ opacity: [0, 0, 1, 1, 0], x: [0, 0, 8, 86, 86], y: [0, 0, -6, 4, 4], scale: [1, 1, 0.9, 0.62, 0.62] }} transition={{ ...T, times: [0, 0.2, 0.3, 0.5, 1] }}>
        {[80, 100, 66].map((w, i) => <span key={i} className="sc-line" style={{ width: `${w}%` }} />)}
      </Motion.div>

      <div className="sc-snap-phone">
        <Smartphone size={34} />
        <Motion.b animate={{ opacity: [0.35, 1, 0.35] }} transition={{ ...LOOP, duration: 1.6 }}>near you</Motion.b>
      </div>

      <Motion.span className="sc-snap-ask" animate={{ opacity: [0, 0, 0, 1, 1, 0], y: [8, 8, 8, 0, 0, 8] }} transition={{ ...T, times: [0, 0.4, 0.5, 0.58, 0.88, 1] }}>
        “Ye <b>ephemeral</b> kya hai?”
      </Motion.span>
      <Motion.div className="sc-snap-wave" animate={{ opacity: [0, 0, 0, 1, 1, 0] }} transition={{ ...T, times: [0, 0.4, 0.5, 0.58, 0.88, 1] }}>
        {Array.from({ length: 9 }, (_, i) => (
          <Motion.span key={i} animate={{ scaleY: [0.25, 1, 0.35, 0.8, 0.25] }} transition={{ ...LOOP, duration: 1.2 + (i % 3) * 0.15, delay: i * 0.07 }} />
        ))}
      </Motion.div>
      <Motion.span className="sc-snap-next" animate={{ opacity: [0, 0, 0, 0, 0, 1, 1, 0], x: [10, 10, 10, 10, 10, 0, 0, 10] }} transition={{ ...T, times: [0, 0.3, 0.5, 0.7, 0.8, 0.86, 0.96, 1] }}>
        Page done → agla snapshot
      </Motion.span>
    </div>
  );
}

function SupportScene() {
  return (
    <div className="sc-support">
      <Motion.div className="sc-support-profile" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 180, damping: 18 }}>
        <span><UserRound size={19} /></span><b>Profile</b><ChevronRight size={15} />
      </Motion.div>
      <Motion.div className="sc-support-tile" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .2, type: "spring", stiffness: 180, damping: 18 }}>
        <span><MessageCircleMore size={19} /></span><b>Help &amp; support</b><i />
      </Motion.div>
      <Motion.div className="sc-support-chat" initial={{ opacity: 0, y: 14, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: .42, type: "spring", stiffness: 180, damping: 18 }}>
        <small><Sparkles size={12} /> Ask me anything</small>
        <p>Confused about a feature?</p>
        <b>Chat here, anytime.</b>
      </Motion.div>
    </div>
  );
}

const SCENES = [
  { title: "Reading Companion", sub: "Tumhara padhne wala saathi", C: BrandScene },
  { title: "Kis ke liye?", sub: "Hindi aur Odia readers", C: WhoScene },
  { title: "Kya milega?", sub: "Samajh, yaad aur aadat", C: BenefitScene },
  { title: "Live reading", sub: "Page dikhao, baat karo", C: ReadScene },
  { title: "Vocabulary", sub: "Hindi · Odia · example", C: VocabScene },
  { title: "Gem posters", sub: "Ek quote, ek poster", C: GemScene },
  { title: "Mind Map", sub: "Book ke ideas ka visual map", C: MindScene },
  { title: "Chapters aur memory", sub: "Progress ka hisaab mere zimme", C: TrackScene },
  { title: "Yeh kyun bana?", sub: "Word atke, padhna nahi", C: WhyScene },
  { title: "90-day secret", sub: "Streak banao, voice unlock karo", C: StreakScene },
  { title: "Reading Companion", sub: "Kahaani shuru hoti hai", C: IntroScene },
  { title: "Woh khaareedi hui kitab", sub: "Jo shelf par reh gayi", C: ShelfScene },
  { title: "Visual recap", sub: "Kahani, filmi andaaz mein", C: RecapScene },
  { title: "AI can answer. Reading Companion remembers.", sub: "Your book + your reading history", C: WhyCompareScene },
  { title: "Words that stay", sub: "Book aur chapter ke saath", C: WhyMemoryScene },
  { title: "Pick up where you left", sub: "Reading ki continuity", C: WhyContinuityScene },
  { title: "A habit that builds", sub: "Goal, streak aur session", C: WhyHabitScene },
  { title: "Your language", sub: "Hindi · Odia · just speak", C: WhyLanguageScene },
  { title: "Ideas you can use", sub: "Gems, steps aur Mind Map", C: WhyApplicationScene },
  { title: "Camera ya snapshot", sub: "Page ek baar dikhao, phir bas poochho", C: SnapshotScene },
  { title: "Help & support", sub: "Profile mein poochho, jo chaaho", C: SupportScene },
];

export default function FeatureScene({ index }) {
  const s = SCENES[index];
  if (!s) return null;
  const Scene = s.C;
  return (
    <div className="sc-wrap">
      <AnimatePresence mode="wait">
        <Motion.div key={index} className="sc-panel"
          initial={{ opacity: 0, y: 24, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -18, scale: 0.96 }} transition={{ duration: 0.35 }}>
          <div className="sc-art"><Scene /></div>
          <div className="sc-title"><b>{s.title}</b><small>{s.sub}</small></div>
        </Motion.div>
      </AnimatePresence>
    </div>
  );
}