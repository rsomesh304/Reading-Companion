import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, CornerDownLeft, Clock3, Search, SearchX, Settings2, Sparkles, X, Zap } from "lucide-react";
import { useBackLayer } from "../backStack.js";
import { PAGES, searchDocs } from "./content.js";
import { useViewport } from "./viewport.js";
import { SCOPES, highlightRanges, scopeSuggestions } from "./search.js";
import { pageIcon } from "./icons.js";

const QUICK = [
  { label: "Site is down?", id: "ops-runbook", ask: "The site is down. What should I check first?" },
  { label: "API limit hit?", id: "ops-ai-keys", ask: "An AI API key hit its limit. What do I do?" },
  { label: "Domain or DNS problem?", id: "ops-domain", ask: "The domain is not loading. How do I fix DNS?" },
  { label: "Show all environment variables", id: "ref-env", ask: "List the environment variables and where each is set" },
  { label: "What changed recently?", id: "ref-changelog", ask: "What changed recently?" },
];

const QUESTION = /^(how|what|why|where|when|who|which|can|could|should|do|does|did|is|are|will|explain)\b|\?$/i;

function Hl({ text, words }) {
  const ranges = words.length ? highlightRanges(text, words) : [];
  if (!ranges.length) return text;
  const out = [];
  let at = 0;
  ranges.forEach(([s, e], i) => {
    if (s > at) out.push(text.slice(at, s));
    out.push(<mark key={i}>{text.slice(s, e)}</mark>);
    at = e;
  });
  if (at < text.length) out.push(text.slice(at));
  return out;
}

function envMatches(query) {
  const q = query.trim().toLowerCase().replace(/\s+/g, "_");
  if (q.length < 3) return [];
  const page = PAGES.find((p) => p.id === "ref-env");
  if (!page) return [];
  const names = [];
  for (const b of page.blocks) {
    if (b.type !== "table") continue;
    for (const row of b.rows) {
      const name = String(row[0]).replace(/`/g, "");
      if (/^[A-Z][A-Z0-9_]+$/.test(name) && name.toLowerCase().includes(q)) names.push({ name, purpose: String(row[1] || "") });
    }
  }
  return names.slice(0, 3);
}

export default function Palette({ theme, recents, origin, onOpen, onAsk, onClose }) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [active, setActive] = useState(0);
  const [typing, setTyping] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const vp = useViewport();
  useBackLayer(true, onClose);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { if (!typing) return undefined; const t = setTimeout(() => setTyping(false), 700); return () => clearTimeout(t); }, [typing, query]);

  const q = query.trim();
  const results = useMemo(() => (q ? searchDocs(q, { scope }) : []), [q, scope]);
  const envs = useMemo(() => envMatches(q), [q]);
  const pageById = (id) => PAGES.find((p) => p.id === id);

  const send = (text) => onAsk(text);
  const scopeLabel = SCOPES.find((s) => s.id === scope)?.label || "All";
  const scopeMatch = SCOPES.find((s) => s.id === scope)?.match;

  const items = (() => {
    const list = [];
    if (!q) {
      recents.map(pageById).filter((p) => p && (!scopeMatch || scopeMatch(p))).slice(0, 4).forEach((p) => list.push({ section: "Recently viewed", icon: pageIcon(p), title: p.title, crumbs: ["Docs", p.group], run: () => onOpen(p.id) }));
      if (scope === "all") QUICK.filter((a) => pageById(a.id)).forEach((a) => list.push({ section: "Suggested", icon: Zap, title: a.label, crumbs: ["Quick action"], run: () => onOpen(a.id), alt: () => send(a.ask) }));
      else scopeSuggestions(PAGES, scope).forEach(({ page, heading }) => list.push({ section: `Suggested in ${scopeLabel}`, icon: pageIcon(page), title: heading || page.title, crumbs: heading ? ["Docs", page.title] : ["Docs", page.group], run: () => onOpen(page.id, heading) }));
      return list;
    }
    if (QUESTION.test(q) && q.split(/\s+/).length >= 3) list.push({ section: "Ask", icon: Sparkles, title: `Ask the Docs Helper`, crumbs: [q], ai: true, run: () => send(q) });
    envs.forEach((e) => list.push({ section: "Environment variable", icon: Settings2, title: e.name, crumbs: ["Environment variables"], snippet: e.purpose, run: () => onOpen("ref-env") }));
    results.forEach((r) => list.push({ section: "Results", icon: pageIcon(pageById(r.id)), title: r.heading ? `${r.title} › ${r.heading}` : r.title, crumbs: ["Docs", r.group, r.title], snippet: r.snippet, words: r.words, run: () => onOpen(r.id, r.heading) }));
    if (!list.some((i) => i.ai)) list.push({ section: "Ask", icon: Sparkles, title: results.length ? "Ask the Docs Helper about this" : "No matches. Ask the Docs Helper about this", crumbs: [q], ai: true, run: () => send(q) });
    return list;
  })();

  useEffect(() => { listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" }); }, [active]);

  const onKey = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); items[active]?.run(); }
  };

  const onChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    setTyping(true);
    setActive(0);
  };

  let lastSection = "";
  const node = (
    <div className={`dxp-wrap dx-theme-${theme}`} data-dx-theme={theme} style={{ top: vp.top, height: vp.h, "--ox": `${origin?.x ?? 0}px`, "--oy": `${(origin?.y ?? 0) - vp.top}px` }} role="dialog" aria-modal="true" aria-label="Search the docs">
      <button type="button" className="dxp-scrim" aria-label="Close search" onClick={onClose} />
      <div className={`dxp${typing ? " typing" : ""}`}>
        <span className="dxp-rim" aria-hidden="true" />
        <div className="dxp-in">
          <div className="dxp-head">
            <Search size={18} className="dxp-ic" />
            <input ref={inputRef} value={query} onChange={onChange} onKeyDown={onKey} enterKeyHint="search" autoComplete="off" autoCorrect="off" spellCheck="false"
              placeholder="Search the docs" aria-label="Search the docs" />
            <button type="button" className="dxp-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
          </div>
          <div className="dxp-scopes" role="group" aria-label="Filter by section">
            {SCOPES.map((s) => (
              <button type="button" key={s.id} className={scope === s.id ? "on" : ""} aria-pressed={scope === s.id}
                onClick={() => { setScope(scope === s.id ? "all" : s.id); setActive(0); }}>
                {s.label}{scope === s.id && s.id !== "all" && <X size={12} aria-label="Clear filter" />}
              </button>
            ))}
          </div>          <div className="dxp-body" ref={listRef}>
            {(
              <>
                {items.map((it, i) => {
                  const head = it.section !== lastSection ? it.section : null;
                  lastSection = it.section;
                  const Icon = it.icon;
                  return (
                    <div key={`${it.section}-${i}`}>
                      {head && <h6 className="dxp-sec">{head === "Recently viewed" ? <Clock3 size={12} /> : null}{head}</h6>}
                      <div className={`dxp-item${i === active ? " on" : ""}${it.ai ? " ai" : ""}`} data-i={i} style={{ "--d": `${Math.min(i, 8) * 28}ms` }}>
                        <button type="button" className="dxp-go" onMouseMove={() => setActive(i)} onClick={it.run}>
                          <span className="dxp-ico"><Icon size={17} /></span>
                          <span className="dxp-txt">
                            <b><Hl text={it.title} words={it.words || []} /></b>
                            <small>{it.crumbs.join(" › ")}</small>
                            {it.snippet && <small className="dxp-snip"><Hl text={it.snippet} words={it.words || []} /></small>}
                          </span>
                          {i === active ? <CornerDownLeft size={14} className="dxp-enter" /> : <ArrowRight size={14} className="dxp-enter dim" />}
                        </button>
                        {it.alt && <button type="button" className="dxp-alt" onClick={it.alt} aria-label={`Ask AI: ${it.title}`}><Sparkles size={14} /></button>}
                      </div>
                    </div>
                  );
                })}
                {!items.length && (
                  <div className="dxp-none">
                    <SearchX size={22} />
                    <b>{q ? `No matches in ${scopeLabel}` : `Nothing to suggest in ${scopeLabel} yet`}</b>
                    {scope !== "all" && <button type="button" onClick={() => setScope("all")}>Clear filter</button>}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="dxp-foot">
            <span><kbd>↑</kbd><kbd>↓</kbd> move <kbd>↵</kbd> open <kbd>esc</kbd> close</span>
          </div>
        </div>
      </div>
    </div>
  );
  return createPortal(node, document.body);
}
