import { useMemo } from "react";
import { ArrowRight, BookMarked, Clock3, Compass, EyeOff, LifeBuoy, Rocket, History } from "lucide-react";
import SearchBox from "./SearchBox.jsx";
import { GROUP_ICON, pageIcon } from "./icons.js";

const PATHS = [
  { id: "welcome", title: "Understand the app", text: "Why it exists, who it is for and how the features connect.", Icon: Compass, tone: "a", art: "tour" },
  { id: "ops-map", title: "Deployment and setup", text: "Every service, what it does and where its settings live.", Icon: Rocket, tone: "b", art: "deploy" },
  { id: "ops-runbook", title: "Fix a problem", text: "Site down, bad deploy, key limit, DNS. Step by step.", Icon: LifeBuoy, tone: "c", art: "fix" },
  { id: "ref-changelog", title: "Recent changes", text: "What shipped, what was fixed, version by version.", Icon: History, tone: "d", art: "log" },
];
const BLURB = {
  "Start here": "The story and principles",
  "Product tour": "Every screen and button",
  Architecture: "How the pieces fit",
  "Run it": "Services, deploys, runbook",
  Reference: "Settings, history, limits",
};

// Small dotted-line illustrations, one per quick-start path.
function Art({ kind }) {
  const dot = { fill: "none", stroke: "currentColor", strokeWidth: 1.2, strokeDasharray: "2 4", strokeLinecap: "round", opacity: 0.55 };
  const solid = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };
  return (
    <svg viewBox="0 0 160 90" aria-hidden="true" className="dh2-art">
      {kind === "tour" && (<><rect x="14" y="12" width="56" height="66" rx="10" {...solid} /><rect x="22" y="22" width="40" height="8" rx="3" {...solid} opacity="0.6" /><rect x="22" y="38" width="28" height="6" rx="3" {...solid} opacity="0.4" /><path d="M70 45 C90 45 90 25 112 25" {...dot} /><path d="M70 45 C90 45 90 65 112 65" {...dot} /><circle cx="122" cy="25" r="10" {...solid} /><circle cx="122" cy="65" r="10" {...solid} /></>)}
      {kind === "deploy" && (<><rect x="10" y="30" width="36" height="30" rx="8" {...solid} /><rect x="62" y="30" width="36" height="30" rx="8" {...solid} /><rect x="114" y="30" width="36" height="30" rx="8" {...solid} /><path d="M46 45 H62 M98 45 H114" {...dot} /><path d="M54 40 l8 5 -8 5" {...solid} /></>)}
      {kind === "fix" && (<><circle cx="80" cy="45" r="26" {...dot} /><circle cx="80" cy="45" r="14" {...solid} /><path d="M80 38 v8 M80 51 v1" {...solid} /><path d="M20 45 H50 M110 45 H140" {...dot} /></>)}
      {kind === "log" && (<><path d="M30 10 V80" {...dot} /><circle cx="30" cy="22" r="5" {...solid} /><circle cx="30" cy="46" r="5" {...solid} /><circle cx="30" cy="70" r="5" {...solid} /><rect x="46" y="16" width="70" height="10" rx="4" {...solid} opacity="0.6" /><rect x="46" y="41" width="96" height="10" rx="4" {...solid} opacity="0.45" /><rect x="46" y="65" width="56" height="10" rx="4" {...solid} opacity="0.3" /></>)}
    </svg>
  );
}

export default function DocsHome({ pages, groups, visited, recents, onOpen, onSearch, onHide }) {
  const byId = useMemo(() => Object.fromEntries(pages.map((p) => [p.id, p])), [pages]);
  const paths = PATHS.filter((p) => byId[p.id]);
  const recent = (recents || []).map((id) => byId[id]).filter(Boolean).slice(0, 4);
  const done = pages.filter((p) => visited.includes(p.id)).length;
  const pct = pages.length ? Math.round((done / pages.length) * 100) : 0;
  const nextUnread = pages.find((p) => !visited.includes(p.id));

  return (
    <div className="dh2">
      <header className="dh2-hero">
        <div className="dh2-dots" aria-hidden="true" />
        <span className="dh2-badge"><BookMarked size={13} aria-hidden="true" />Reading Companion handbook</span>
        <h1>Everything about the app,<br /><em>in one place.</em></h1>
        <p>What exists, why it exists, how it runs, and what to do when something breaks. Search it, or just ask.</p>
        <SearchBox variant="hero" onOpen={onSearch} />
        {nextUnread && (
          <button type="button" className="dh2-continue" onClick={() => onOpen(nextUnread.id)}>
            {done ? "Continue where you left off" : "Start with the basics"}<b>{nextUnread.title}</b><ArrowRight size={14} aria-hidden="true" />
          </button>
        )}
      </header>

      <section aria-label="Quick start" className="dh2-sec">
        <h2>Start here</h2>
        <div className="dh2-paths">
          {paths.map((p, i) => (
            <button type="button" key={p.id} className={`dh2-path t-${p.tone}`} style={{ "--i": i }} onClick={() => onOpen(p.id)}>
              <Art kind={p.art} />
              <span className="dh2-path-ico"><p.Icon size={18} aria-hidden="true" /></span>
              <b>{p.title}</b>
              <small>{p.text}</small>
              <ArrowRight size={16} className="dh2-go" aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section aria-label="Recently viewed" className="dh2-sec">
          <h2><Clock3 size={14} aria-hidden="true" />Recently viewed</h2>
          <div className="dh2-recent">
            {recent.map((p) => { const Icon = pageIcon(p); return (
              <button type="button" key={p.id} onClick={() => onOpen(p.id)}><Icon size={15} aria-hidden="true" /><span><b>{p.title}</b><small>{p.group}</small></span></button>
            ); })}
          </div>
        </section>
      )}

      <section aria-label="Browse by section" className="dh2-sec">
        <h2>Browse by section</h2>
        <div className="dh2-groups">
          {groups.map((g, i) => {
            const list = pages.filter((p) => p.group === g);
            const read = list.filter((p) => visited.includes(p.id)).length;
            const GIcon = GROUP_ICON[g];
            return (
              <div key={g} className="dh2-group" style={{ "--i": i }}>
                <div className="dh2-group-head">
                  <span className="dh2-group-ico">{GIcon && <GIcon size={17} aria-hidden="true" />}</span>
                  <div><b>{g}</b><small>{BLURB[g]}</small></div>
                  <em>{read}/{list.length}</em>
                </div>
                <ul>
                  {list.map((p) => { const Icon = pageIcon(p); return (
                    <li key={p.id}><button type="button" onClick={() => onOpen(p.id)}><Icon size={14} aria-hidden="true" /><span>{p.title}</span>{visited.includes(p.id) && <i aria-label="Read" />}</button></li>
                  ); })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="dh2-foot">
        <div className="dh2-meter" role="img" aria-label={`${pct}% read`}><i style={{ width: `${pct}%` }} /></div>
        <span>{done} of {pages.length} pages read</span>
        <button type="button" onClick={onHide}><EyeOff size={13} aria-hidden="true" />Hide the Docs card</button>
      </footer>
    </div>
  );
}
