import { useEffect, useMemo, useRef, useState } from "react";
import { motion as Motion } from "framer-motion";
import { BookOpen, Sparkles } from "lucide-react";
import "./JourneyRecap.css";
import { resolveStorySource } from "./story/resolveStorySource.js";

const CLOSED = new Set(["closed", "completed", "done", "finished"]);

// Animated vertical journey: chapters unfold as cards along a gradient
// timeline spine, from Chapter 1 to the reader's current position.
// Used embedded inside the Chapter Grid "Timeline" tab.
export default function JourneyRecap({ book, chapters, embedded = true }) {
  const source = useMemo(() => resolveStorySource(book), [book]);
  const list = useMemo(() => {
    const currentNo = Number(book?.currentChapterNumber || 0);
    return chapters
      .filter((c) => !c.isPlaceholder && Number.isFinite(Number(c.number)))
      .filter((c) => {
        const status = String(c.status || "").trim().toLowerCase();
        const read = CLOSED.has(status) || (typeof c.summary === "string" && c.summary.trim().length > 0);
        const isCurrent = Number(c.number) === currentNo;
        const isPast = Number(c.number) < currentNo;
        return read || isCurrent || isPast;
      })
      .sort((a, b) => Number(a.number) - Number(b.number));
  }, [book?.currentChapterNumber, chapters]);
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  const cardRefs = useRef([]);
  const pace = list.length <= 5 ? 1350 : list.length <= 12 ? 950 : 620;

  useEffect(() => {
    if (shown >= list.length) {
      const t = setTimeout(() => setDone(true), 450);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown((v) => v + 1), shown === 0 ? 550 : pace);
    return () => clearTimeout(t);
  }, [shown, list.length, pace]);

  const totalWords = list.reduce((s, c) => s + (String(c.summary || "").split(/\s+/).filter(Boolean).length), 0);
  const doneCount = list.filter((c) => CLOSED.has(String(c.status || "").trim().toLowerCase()) || (typeof c.summary === "string" && c.summary.trim().length > 0)).length;
  const current = Number(book?.currentChapterNumber || 0);

  return (
    <Motion.div className={`jr-root ${embedded ? "embedded" : ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <div className="jr-bg" />

      <header className="jr-head">
        <div className="jr-head-text">
          <span className="jr-eyebrow">Your journey so far</span>
          <h1>{book?.title || "Your book"}</h1>
          <div className="jr-stats">
            <span><BookOpen size={12} /> {doneCount}/{list.length} chapters</span>
            <span><Sparkles size={12} /> {totalWords} words learned</span>
          </div>
        </div>
      </header>

      <div className="jr-scroll">
        <div className="jr-spine" aria-hidden="true">
          <Motion.div className="jr-spine-fill" initial={{ height: "0%" }}
            animate={{ height: `${(shown / Math.max(list.length, 1)) * 100}%` }}
            transition={{ duration: 0.55, ease: "easeOut" }} />
        </div>

        {list.map((c, i) => {
          const visible = i < shown;
          const isCurrent = c.number === current;
          const sourceSummary = String(c.summary || source?.summary || "").trim();
          const sentences = sourceSummary ? sourceSummary.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 3) : [];
          return (
            <div key={c.number} className="jr-slot" ref={(el) => { cardRefs.current[i] = el; }}>
              <Motion.span className={`jr-node ${isCurrent ? "now" : ""}`}
                initial={{ scale: 0.3, opacity: 0.2 }}
                animate={visible ? { scale: 1, opacity: 1 } : { scale: 0.3, opacity: 0.25 }}
                transition={{ type: "spring", stiffness: 320, damping: 16 }}>
                {c.number}
              </Motion.span>

              <Motion.div className={`jr-card ${isCurrent ? "now" : ""}`}
                initial={{ opacity: 0, y: 42, rotateX: -16, scale: 0.94 }}
                animate={visible ? { opacity: 1, y: 0, rotateX: 0, scale: 1 } : {}}
                transition={{ type: "spring", stiffness: 150, damping: 17 }}>

                <div className="jr-card-head">
                  <span className="jr-chap">Chapter {c.number}</span>
                  {c.title && c.title !== `Chapter ${c.number}` && <b>{c.title}</b>}
                  {(c.startPage || c.endPage) && <small>Pg {c.startPage ?? "?"}{c.endPage ? `–${c.endPage}` : ""}</small>}
                </div>

                {sentences.length > 0 ? (
                  <p className="jr-sum">
                    {sentences.map((s, k) => (
                      <Motion.span key={k} initial={{ opacity: 0, y: 8 }}
                        animate={visible ? { opacity: 1, y: 0 } : {}}
                        transition={{ delay: 0.28 + k * 0.24 }}>{s} </Motion.span>
                    ))}
                  </p>
                ) : (
                  <p className="jr-sum dim">Is chapter ki notes abhi banti jaa rahi hain…</p>
                )}

                {sourceSummary && <p className="jr-sum">{sourceSummary}</p>}
              </Motion.div>
            </div>
          );
        })}

        <div className="jr-final">
          <Motion.div className="jr-you" initial={{ scale: 0, opacity: 0 }}
            animate={done ? { scale: 1, opacity: 1 } : {}}
            transition={{ type: "spring", stiffness: 220, damping: 13 }}>
            <span className="jr-you-dot" /> You are here
          </Motion.div>
        </div>
      </div>
    </Motion.div>
  );
}
