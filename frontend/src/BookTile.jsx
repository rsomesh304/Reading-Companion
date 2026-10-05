import { motion as Motion } from "framer-motion";
import { Play, Trash2, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "./BookTile.css";

const PALETTE = [
  ["#7c3aed", "#4338ca"], ["#0891b2", "#1d4ed8"], ["#ea580c", "#be123c"], ["#059669", "#0f766e"],
  ["#db2777", "#7e22ce"], ["#d97706", "#b91c1c"], ["#0284c7", "#4f46e5"], ["#65a30d", "#047857"],
];

// Stable colour identity per book, independent of its position on the shelf.
function paletteFor(id) {
  let hash = 0;
  for (const ch of String(id)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

const RING = { size: 46, stroke: 5 };
const RADIUS = (RING.size - RING.stroke) / 2;
const CIRC = 2 * Math.PI * RADIUS;

export default function BookTile({ book, index, completed, total, date, time, onOpen, onDelete, onAuthor, onPlay }) {
  const ref = useRef(null);
  const frame = useRef(0);
  const [ready, setReady] = useState(false);
  const [c1, c2] = paletteFor(book.id);
  const pct = total > 0 ? Math.min(1, completed / total) : 0;
  const angle = pct * 2 * Math.PI - Math.PI / 2;

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => { cancelAnimationFrame(id); cancelAnimationFrame(frame.current); };
  }, []);

  function tilt(event) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.style.setProperty("--rx", `${((0.5 - y) * 9).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((x - 0.5) * 9).toFixed(2)}deg`);
      el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      el.style.setProperty("--lit", "1");
    });
  }
  function rest() {
    cancelAnimationFrame(frame.current);
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--lit", "0");
  }

  return (
    <Motion.div
      className="bk"
      style={{ "--c1": c1, "--c2": c2 }}
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 190, damping: 20, delay: Math.min(index * 0.06, 0.36) }}
    >
      <div ref={ref} className="bk-tilt" onPointerMove={tilt} onPointerLeave={rest} onPointerCancel={rest} onPointerUp={(e) => { if (e.pointerType !== "mouse") rest(); }}>
        <div className="bk-cover" role="button" tabIndex={0} onClick={onOpen}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}>
          <span className="bk-spine" aria-hidden="true" />
          <span className="bk-mark" aria-hidden="true">{(book.title || "?").trim()[0]?.toUpperCase()}</span>
          <span className="bk-lines" aria-hidden="true" />
          <span className="bk-shine" aria-hidden="true" />
          <div className="bk-title">{book.title}</div>
        </div>

        <div className="bk-panel">
          <div className="bk-prog">
            <div className="bk-ring" aria-hidden="true">
              <svg viewBox={`0 0 ${RING.size} ${RING.size}`}>
                <defs>
                  <linearGradient id={`bkg-${book.id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#fde68a" /></linearGradient>
                </defs>
                <g transform={`rotate(-90 ${RING.size / 2} ${RING.size / 2})`}>
                  <circle className="bk-track" cx={RING.size / 2} cy={RING.size / 2} r={RADIUS} strokeWidth={RING.stroke} />
                  <circle className="bk-fill" cx={RING.size / 2} cy={RING.size / 2} r={RADIUS} strokeWidth={RING.stroke}
                    stroke={`url(#bkg-${book.id})`} strokeDasharray={CIRC} strokeDashoffset={ready ? CIRC * (1 - pct) : CIRC} />
                  {pct > 0 && pct < 1 && (
                    <circle className="bk-dot" cx={RING.size / 2 + RADIUS * Math.cos(angle)} cy={RING.size / 2 + RADIUS * Math.sin(angle)} r="3.2" />
                  )}
                </g>
                <text className="bk-ring-label" x={RING.size / 2} y={RING.size / 2} textAnchor="middle" dominantBaseline="central">{Math.round(pct * 100)}%</text>
              </svg>
            </div>
            <div className="bk-prog-text"><b>{completed}/{total}</b><span>Chapters</span></div>
          </div>
          <div className="bk-last"><span>Last read</span><b>{date} · {time}</b></div>
          <div className="bk-foot">
            <button type="button" className="bk-author" onClick={onAuthor}><User size={12} /> Author</button>
            <button type="button" className="bk-play" onClick={onPlay} aria-label="Start reading"><Play size={14} fill="currentColor" /></button>
          </div>
        </div>

        <button type="button" className="bk-del" onClick={onDelete} aria-label="Delete book"><Trash2 size={13} /></button>
      </div>
    </Motion.div>
  );
}
