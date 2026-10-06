import { motion as Motion, useReducedMotion } from "framer-motion";
import "./CatalogCard.css";

const KINDS = [
  { type: "feature", label: "New", code: "N" },
  { type: "improve", label: "Improved", code: "I" },
  { type: "fix", label: "Fixed", code: "F" },
];

// Library catalogue index card, used for releases flagged `"catalog": true` in release-notes.json.
export default function CatalogCard({ release }) {
  const reduce = useReducedMotion();
  const items = release.items || [];
  let n = 0;
  const rows = KINDS.flatMap(({ type, label, code }) => items.filter((it) => it.type === type).map((it) => ({ ...it, label, code, no: String(++n).padStart(2, "0") })));
  const rise = (i) => (reduce ? {} : { initial: { opacity: 0, x: -8 }, animate: { opacity: 1, x: 0 }, transition: { delay: 0.25 + i * 0.07, duration: 0.3, ease: "easeOut" } });
  return (
    <Motion.article
      className="cc-card"
      initial={reduce ? false : { opacity: 0, y: 18, rotate: -1.2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <span className="cc-hole" aria-hidden="true" />
      <header className="cc-head">
        <div className="cc-meta">
          <span>CATALOGUE CARD</span>
        </div>
        <h3 className="cc-title">{release.title || `Version ${release.version}`}</h3>
        <p className="cc-sub">Reading Companion</p>
        <Motion.div
          className="cc-stamp"
          aria-label={`Version ${release.version}, ${release.title}`}
          initial={reduce ? false : { opacity: 0, scale: 1.7, rotate: -26 }}
          animate={{ opacity: 1, scale: 1, rotate: -9 }}
          transition={{ delay: 0.45, type: "spring", stiffness: 260, damping: 16 }}
        >
          <small>VERSION</small>
          <b>{release.version}</b>
          <em>{String(release.title || "").toUpperCase()}</em>
        </Motion.div>
      </header>
      <ol className="cc-list">
        {rows.map((row, i) => (
          <Motion.li key={i} className={`cc-row ${row.type}`} {...rise(i)}>
            <span className="cc-no">{row.no}</span>
            <span className="cc-tag">{row.code}</span>
            <span className="cc-text"><i>{row.label}.</i> {row.text}</span>
          </Motion.li>
        ))}
      </ol>
      <footer className="cc-foot"><span>{release.date || "Recently updated"}</span><span>N new · I improved · F fixed</span></footer>
    </Motion.article>
  );
}
