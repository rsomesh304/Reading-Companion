import { useMemo, useState } from "react";
import { BookMarked, Compass, EyeOff, Layers, Library, Rocket, Search, Sparkles, ArrowRight, Check } from "lucide-react";
import "./docs-home.css";

const META = {
  "Start here": { Icon: Sparkles, color: "#ffb454", blurb: "The why" },
  "Product tour": { Icon: Compass, color: "#42d897", blurb: "The what" },
  Architecture: { Icon: Layers, color: "#6aa9ff", blurb: "The how" },
  "Run it": { Icon: Rocket, color: "#ff7a45", blurb: "The ops" },
  Reference: { Icon: Library, color: "#b48cff", blurb: "The facts" },
};
const SPEEDS = [26, 34, 44, 56, 70];
const QUICK = [
  ["ops-runbook", "Something broke?"],
  ["arch-flows", "Watch the data flow"],
  ["ref-env", "All settings"],
  ["ref-changelog", "What changed"],
];

export default function DocsHome({ pages, groups, visited, onOpen, onSearch, onHide }) {
  const [active, setActive] = useState(groups[0]);
  const byGroup = useMemo(() => Object.fromEntries(groups.map((g) => [g, pages.filter((p) => p.group === g)])), [pages, groups]);
  const nextUnread = pages.find((p) => !visited.includes(p.id)) || pages[0];
  const doneCount = pages.filter((p) => visited.includes(p.id)).length;
  const pct = pages.length ? Math.round((doneCount / pages.length) * 100) : 0;
  const meta = META[active] || META["Start here"];
  const quick = QUICK.filter(([id]) => pages.some((p) => p.id === id));

  return (
    <div className="dh">
      <div className="dh-aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="dh-stars" aria-hidden="true" />

      <section className="dh-hero">
        <span className="dh-eyebrow"><BookMarked size={13} /> Private handbook</span>
        <h1>Everything about<br /><em>Reading Companion</em></h1>
        <p>What exists, why it exists, how it runs, and what to do when it breaks. Pick a world to explore.</p>
        <button type="button" className="dh-search" onClick={onSearch}><Search size={16} /> <span>Search anything…</span><kbd>/</kbd></button>
      </section>

      <section className="dh-orbit-wrap" aria-label="Sections">
        <div className="dh-orbit">
          <div className="dh-core" style={{ "--c": meta.color }}>
            <meta.Icon size={26} />
            <b>{active}</b>
            <small>{meta.blurb}</small>
          </div>
          {groups.map((g, i) => {
            const m = META[g] || META["Start here"];
            const diam = 38 + i * 15.5;
            return (
              <div key={g} className="dh-ring" style={{ "--d": `${diam}%`, "--a": `${i * 72 + 18}deg`, "--t": `${SPEEDS[i % SPEEDS.length]}s` }}>
                <span className="dh-slot">
                  <button type="button" className={`dh-planet${g === active ? " on" : ""}`} style={{ "--c": m.color }} onClick={() => setActive(g)} aria-pressed={g === active} aria-label={g}>
                    <m.Icon size={17} />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
        <div className="dh-legend" role="tablist">
          {groups.map((g) => (
            <button key={g} type="button" role="tab" aria-selected={g === active} className={g === active ? "on" : ""} style={{ "--c": (META[g] || META["Start here"]).color }} onClick={() => setActive(g)}>{g}</button>
          ))}
        </div>
      </section>

      <section className="dh-stats">
        <div><b>{pages.length}</b><span>pages</span></div>
        <div><b>{doneCount}</b><span>read</span></div>
        <div className="dh-meter" aria-label={`${pct}% read`}><i style={{ width: `${pct}%` }} /></div>
      </section>

      <section className="dh-panel" key={active} style={{ "--c": meta.color }}>
        <h2><meta.Icon size={16} /> {active}</h2>
        <ol className="dh-list">
          {byGroup[active].map((p, i) => (
            <li key={p.id} style={{ "--i": i }}>
              <button type="button" onClick={() => onOpen(p.id)}>
                <span className="dh-num">{visited.includes(p.id) ? <Check size={14} /> : String(i + 1).padStart(2, "0")}</span>
                <span className="dh-txt"><b>{p.title}</b><small>{p.summary}</small></span>
                <ArrowRight size={16} className="dh-go" />
              </button>
            </li>
          ))}
        </ol>
      </section>

      {quick.length > 0 && (
        <section className="dh-quick" aria-label="Quick jumps">
          {quick.map(([id, label]) => (
            <button type="button" key={id} onClick={() => onOpen(id)}>{label}</button>
          ))}
        </section>
      )}

      <section className="dh-cta">
        <button type="button" className="dh-go-btn" onClick={() => onOpen(nextUnread.id)}>
          <span>{doneCount ? "Continue with" : "Start with"}<b>{nextUnread.title}</b></span>
          <ArrowRight size={18} />
        </button>
      </section>

      <div className="dh-hide">
        <button type="button" onClick={onHide}><EyeOff size={14} /> Hide the Docs card</button>
        <p>You can unlock it again from Profile → About.</p>
      </div>
    </div>
  );
}