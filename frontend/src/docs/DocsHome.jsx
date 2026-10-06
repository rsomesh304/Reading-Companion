import { useMemo, useState } from "react";
import { ArrowRight, BookMarked, ChevronDown, Compass, EyeOff, Layers, Library, Rocket, Search, Sparkles } from "lucide-react";
import "./docs-home.css";

const META = {
  "Start here": { Icon: Sparkles, a: "#ffb454", b: "#ff7a6b", blurb: "Why the app exists and who it is for" },
  "Product tour": { Icon: Compass, a: "#34e0a1", b: "#22b8cf", blurb: "Every screen, button and feature" },
  Architecture: { Icon: Layers, a: "#6ea8ff", b: "#8b7bff", blurb: "How the pieces fit together" },
  "Run it": { Icon: Rocket, a: "#ff8a5c", b: "#ff5c8a", blurb: "Deploys, services and fixing things" },
  Reference: { Icon: Library, a: "#c39bff", b: "#ff7ad9", blurb: "Settings, history and limits" },
};
const QUICK = [
  ["ops-runbook", "Something broke?"],
  ["arch-flows", "Data flows"],
  ["ref-env", "All settings"],
  ["ref-changelog", "What changed"],
];

export default function DocsHome({ pages, groups, visited, onOpen, onSearch, onHide }) {
  const [open, setOpen] = useState(null);
  const byGroup = useMemo(() => Object.fromEntries(groups.map((g) => [g, pages.filter((p) => p.group === g)])), [pages, groups]);
  const nextUnread = pages.find((p) => !visited.includes(p.id)) || pages[0];
  const done = pages.filter((p) => visited.includes(p.id)).length;
  const pct = pages.length ? Math.round((done / pages.length) * 100) : 0;
  const quick = QUICK.filter(([id]) => pages.some((p) => p.id === id));
  const started = done > 0;

  return (
    <div className="dh">
      <div className="dh-glow" aria-hidden="true"><i /><i /></div>

      <header className="dh-hero">
        <span className="dh-badge"><BookMarked size={14} /> Private handbook</span>
        <h1>Reading Companion<span>Handbook</span></h1>
        <p>What exists, why it exists, how it runs, and what to do when it breaks.</p>
        <button type="button" className="dh-search" onClick={onSearch}>
          <Search size={18} />
          <span>Search the docs</span>
        </button>
      </header>

      {nextUnread && (
        <button type="button" className="dh-continue" onClick={() => onOpen(nextUnread.id)}>
          <span className="dh-continue-text">
            <em>{started ? "Continue reading" : "Start here"}</em>
            <b>{nextUnread.title}</b>
          </span>
          <span className="dh-continue-go"><ArrowRight size={18} /></span>
        </button>
      )}

      <div className="dh-stats">
        <div className="dh-meter"><i style={{ width: `${pct}%` }} /></div>
        <span>{done} of {pages.length} pages read</span>
      </div>

      <ul className="dh-list">
        {groups.map((g, i) => {
          const list = byGroup[g] || [];
          const meta = META[g] || META["Start here"];
          const read = list.filter((p) => visited.includes(p.id)).length;
          const isOpen = open === g;
          return (
            <li key={g} className={`dh-card${isOpen ? " open" : ""}`} style={{ "--a": meta.a, "--b": meta.b, "--i": i }}>
              <button type="button" className="dh-card-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : g)}>
                <span className="dh-icon"><meta.Icon size={22} /></span>
                <span className="dh-card-text">
                  <b>{g}</b>
                  <small>{meta.blurb}</small>
                  <span className="dh-bar"><i style={{ width: list.length ? `${(read / list.length) * 100}%` : 0 }} /></span>
                </span>
                <span className="dh-count">{read}/{list.length}</span>
                <ChevronDown size={18} className="dh-chev" />
              </button>
              <div className="dh-pages" hidden={!isOpen}>
                {list.map((p, n) => (
                  <button type="button" key={p.id} onClick={() => onOpen(p.id)}>
                    <span className="dh-num">{n + 1}</span>
                    <span className="dh-page-title">{p.title}</span>
                    {visited.includes(p.id) && <span className="dh-dot" aria-label="Read" />}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      {quick.length > 0 && (
        <div className="dh-quick">
          <h2>Jump straight to</h2>
          <div>{quick.map(([id, label]) => <button type="button" key={id} onClick={() => onOpen(id)}>{label}</button>)}</div>
        </div>
      )}

      <button type="button" className="dh-hide" onClick={onHide}><EyeOff size={14} /> Hide the Docs card</button>
    </div>
  );
}
