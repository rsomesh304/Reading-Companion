import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookMarked, ChevronLeft, ChevronRight, Copy, EyeOff, List, Search, X, Lock } from "lucide-react";
import { checkDocsAccess } from "../docsAccess.js";
import { useBackLayer } from "../backStack.js";
import { setDocsUnlocked } from "../docsUnlock.js";
import { PAGES, GROUPS, getConfirms, searchDocs } from "./content.js";
import { loadDocsContent } from "./registry.js";
import { Block } from "./blocks.jsx";
import DocsHome from "./DocsHome.jsx";
import "./docs.css";

const VISITED_KEY = "rc_docs_visited";
const store = {
  get(key) { try { return window.localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { window.localStorage.setItem(key, value); } catch { /* storage unavailable */ } },
  remove(key) { try { window.localStorage.removeItem(key); } catch { /* storage unavailable */ } },
};

function useWide() {
  const query = "(min-width: 960px)";
  const [wide, setWide] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const onChange = () => setWide(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return wide;
}

function useOwnerGate() {
  const [state, setState] = useState({ status: "checking", userId: "", reason: "" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    checkDocsAccess({ onCached: (userId) => { if (!cancelled) setState({ status: "ok", userId, reason: "" }); } }).then((result) => {
      if (!cancelled) setState({ status: result.status, userId: result.userId, reason: result.reason || "" });
    });
    return () => { cancelled = true; };
  }, [attempt]);
  return [state, () => { setState({ status: "checking", userId: "", reason: "" }); setAttempt((n) => n + 1); }];
}

function Gate({ state, retry, onBack }) {
  const [copied, setCopied] = useState(false);
  const message = {
    signed_out: "Sign in with your owner account to open the docs.",
    not_owner: "This account is not the owner of the app.",
    not_configured: "Owner access is not set up yet on the server.",
  }[state.reason];
  return (
    <div className="dx-root">
      <header className="dx-bar"><button type="button" className="dx-icon" onClick={onBack} aria-label="Back"><ArrowLeft size={18} /></button><strong>Docs</strong></header>
      <div className="dx-gate">
        <Lock size={28} aria-hidden="true" />
        {state.status === "checking" && <p>Checking access…</p>}
        {state.status === "error" && (
          <>
            <p>Could not check access right now ({state.reason}). You may be offline, or the server is waking up.</p>
            <button type="button" className="dx-btn" onClick={retry}>Try again</button>
          </>
        )}
        {state.status === "denied" && (
          <>
            <p>{message}</p>
            {state.userId && state.reason !== "signed_out" && (
              <>
                <p className="dx-small">If this is your account, set <code className="dx-code-inline">DOCS_OWNER_USER_IDS</code> on the server to this id (see Run it → Render), then try again.</p>
                <button type="button" className="dx-id" onClick={() => navigator.clipboard?.writeText(state.userId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }).catch(() => {})}>
                  <span>{state.userId}</span><Copy size={14} /><em>{copied ? "Copied" : "Copy"}</em>
                </button>
                <button type="button" className="dx-btn" onClick={retry}>Check again</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyDocs({ onBack, missing }) {
  return (
    <div className="dx-root">
      <header className="dx-bar"><button type="button" className="dx-icon" onClick={onBack} aria-label="Back"><ArrowLeft size={18} /></button><strong>Docs</strong></header>
      <div className="dx-gate"><BookMarked size={28} aria-hidden="true" /><p>{missing ? "The docs have not been published yet. Run the publish script from the project folder." : "The docs content could not be loaded. Check your connection and reopen Docs."}</p></div>
    </div>
  );
}

function Toc({ currentId, visited, onPick, onAnchor, current }) {
  return (
    <nav className="dx-toc" aria-label="Table of contents">
      {GROUPS.map((group) => (
        <div key={group} className="dx-toc-group">
          <h5>{group}</h5>
          {PAGES.filter((pg) => pg.group === group).map((pg) => (
            <div key={pg.id}>
              <button type="button" className={`dx-toc-item${pg.id === currentId ? " on" : ""}${visited.includes(pg.id) ? " seen" : ""}`} onClick={() => onPick(pg.id)}>{pg.title}</button>
              {pg.id === currentId && current && current.blocks.filter((b) => b.type === "h2").map((b) => (
                <button type="button" key={b.text} className="dx-toc-sub" onClick={() => onAnchor(b.text)}>{b.text}</button>
              ))}
            </div>
          ))}
        </div>
      ))}
    </nav>
  );
}

function SearchPanel({ onPick, onClose }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchDocs(query), [query]);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div className="dx-search" role="dialog" aria-label="Search docs">
      <div className="dx-search-box">
        <Search size={16} aria-hidden="true" />
        <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the docs" aria-label="Search the docs" />
        <button type="button" className="dx-icon" onClick={onClose} aria-label="Close search"><X size={16} /></button>
      </div>
      <div className="dx-search-list">
        {query && !results.length && <p className="dx-small">No matches. Try a simpler word.</p>}
        {results.map((r) => (
          <button type="button" key={r.id} onClick={() => onPick(r.id, r.heading)}>
            <b>{r.title}</b>
            <span>{r.group}{r.heading ? ` · ${r.heading}` : ""}</span>
          </button>
        ))}
        {!query && <p className="dx-small">Try “Vercel”, “rollback”, “push”, “Ghost Mode” or “environment”.</p>}
      </div>
    </div>
  );
}

function Stamp() {
  const built = typeof __DOCS_BUILT_AT__ === "string" ? __DOCS_BUILT_AT__ : "";
  const commit = typeof __DOCS_COMMIT__ === "string" ? __DOCS_COMMIT__ : "";
  const date = built ? new Date(built).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "unknown";
  return <p className="dx-stamp">Last updated with the app build on <b>{date}</b>{commit ? <> · commit <code className="dx-code-inline">{commit}</code></> : null}. This stamp updates automatically on every deploy.</p>;
}

function ConfirmList({ onPick }) {
  return (
    <ul className="dx-confirm-list">
      {getConfirms().map((c, i) => (
        <li key={i}><button type="button" onClick={() => onPick(c.page)}><b>{c.title}</b><span>{c.text}</span></button></li>
      ))}
    </ul>
  );
}

function Article({ page, onPickPage, scrollRef }) {
  const bodyRef = useRef(null);
  useEffect(() => {
    const root = scrollRef.current;
    const nodes = bodyRef.current?.querySelectorAll(".dx-reveal") || [];
    if (!root || typeof IntersectionObserver === "undefined") { nodes.forEach((n) => n.classList.add("in")); return undefined; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { root, threshold: 0.05 });
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [page, scrollRef]);
  return (
    <article className="dx-article" ref={bodyRef}>
      <span className="dx-kicker">{page.group}</span>
      <h1>{page.title}</h1>
      <p className="dx-lead">{page.summary}</p>
      {page.blocks.map((block, i) => (
        <div className="dx-reveal" key={`${page.id}-${i}`}>
          {block.type === "stamp" ? <Stamp /> : block.type === "confirmlist" ? <ConfirmList onPick={onPickPage} /> : <Block block={block} />}
        </div>
      ))}
    </article>
  );
}

function DocsApp({ nav }) {
  const wide = useWide();
  const [openId, setOpenId] = useState(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visited, setVisited] = useState(() => { try { return JSON.parse(store.get(VISITED_KEY) || "[]"); } catch { return []; } });
  const scrollRef = useRef(null);
  const pendingAnchor = useRef("");

  const index = PAGES.findIndex((pg) => pg.id === openId);
  const page = index >= 0 ? PAGES[index] : null;

  useBackLayer(openId !== null, () => setOpenId(null));
  useBackLayer(tocOpen && !wide, () => setTocOpen(false));
  useBackLayer(searchOpen, () => setSearchOpen(false));

  const openPage = useCallback((id, anchorText = "") => {
    pendingAnchor.current = anchorText;
    setOpenId(id);
    setTocOpen(false);
    setSearchOpen(false);
    setVisited((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      store.set(VISITED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const scrollToHeading = useCallback((text) => {
    setTocOpen(false);
    const el = [...(scrollRef.current?.querySelectorAll("h2") || [])].find((h) => h.textContent === text);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    root.scrollTo({ top: 0 });
    setProgress(0);
    if (pendingAnchor.current) {
      const text = pendingAnchor.current;
      pendingAnchor.current = "";
      requestAnimationFrame(() => scrollToHeading(text));
    }
  }, [openId, scrollToHeading]);

  const onScroll = (event) => {
    const el = event.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    setProgress(max > 0 ? Math.min(1, el.scrollTop / max) : 1);
  };

  const hideDocs = () => { setDocsUnlocked(false); nav.goProfile(); };
  const back = () => (openId !== null ? setOpenId(null) : nav.goBack());
  const prev = index > 0 ? PAGES[index - 1] : null;
  const next = index >= 0 && index < PAGES.length - 1 ? PAGES[index + 1] : null;

  return (
    <div className="dx-root">
      <header className="dx-bar">
        <button type="button" className="dx-icon" onClick={back} aria-label="Back"><ArrowLeft size={18} /></button>
        <div className="dx-bar-title"><strong>{page ? page.title : "Docs"}</strong><span>{page ? page.group : "Reading Companion handbook"}</span></div>
        <button type="button" className="dx-icon" onClick={() => setSearchOpen(true)} aria-label="Search"><Search size={18} /></button>
        {!wide && <button type="button" className="dx-icon" onClick={() => setTocOpen(true)} aria-label="Table of contents"><List size={18} /></button>}
        <div className="dx-progress" aria-hidden="true"><i style={{ transform: `scaleX(${page ? progress : 0})` }} /></div>
      </header>

      <div className="dx-body">
        {wide && <aside className="dx-side"><Toc currentId={openId} visited={visited} onPick={openPage} onAnchor={scrollToHeading} current={page} /></aside>}
        <div className="dx-scroll" ref={scrollRef} onScroll={onScroll}>
          {page ? (
            <>
              <Article page={page} onPickPage={openPage} scrollRef={scrollRef} />
              <footer className="dx-pager">
                {prev ? <button type="button" onClick={() => openPage(prev.id)}><ChevronLeft size={16} /><span><em>Previous</em>{prev.title}</span></button> : <i />}
                {next ? <button type="button" className="next" onClick={() => openPage(next.id)}><span><em>Next</em>{next.title}</span><ChevronRight size={16} /></button> : <i />}
              </footer>
            </>
          ) : (
            <DocsHome pages={PAGES} groups={GROUPS} visited={visited} onOpen={openPage} onSearch={() => setSearchOpen(true)} onHide={hideDocs} />
          )}
        </div>
      </div>

      {!wide && tocOpen && (
        <div className="dx-sheet-wrap">
          <button type="button" className="dx-scrim" aria-label="Close menu" onClick={() => setTocOpen(false)} />
          <div className="dx-sheet" role="dialog" aria-label="Table of contents">
            <div className="dx-sheet-grab" aria-hidden="true" />
            <div className="dx-sheet-head"><strong>Contents</strong><button type="button" className="dx-icon" onClick={() => setTocOpen(false)} aria-label="Close"><X size={16} /></button></div>
            <div className="dx-sheet-body">
              <Toc currentId={openId} visited={visited} onPick={openPage} onAnchor={scrollToHeading} current={page} />
              <button type="button" className="dx-hide-link" onClick={hideDocs}><EyeOff size={14} /> Hide the Docs card</button>
            </div>
          </div>
        </div>
      )}
      {searchOpen && <SearchPanel onPick={openPage} onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

function useDocsContent(enabled) {
  const [state, setState] = useState(PAGES.length ? "ready" : "loading");
  useEffect(() => {
    if (!enabled || state === "ready") return undefined;
    let live = true;
    loadDocsContent().then((r) => { if (live) setState(r.status); });
    return () => { live = false; };
  }, [enabled, state]);
  return state;
}

export default function DocsScreen({ nav }) {
  const [gate, retry] = useOwnerGate();
  const content = useDocsContent(gate.status === "ok");
  if (gate.status !== "ok") return <Gate state={gate} retry={retry} onBack={nav.goBack} />;
  if (content === "loading") return <Gate state={{ status: "checking" }} retry={retry} onBack={nav.goBack} />;
  if (content !== "ready") return <EmptyDocs onBack={nav.goBack} missing={content === "missing"} />;
  return <DocsApp nav={nav} />;
}