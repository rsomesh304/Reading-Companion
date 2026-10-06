import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, BookMarked, Check, ChevronLeft, ChevronRight, Copy, EyeOff, List, Lock, Moon, Search, PanelRight, Sparkles, Sun, X } from "lucide-react";
import { checkDocsAccess } from "../docsAccess.js";
import { useBackLayer } from "../backStack.js";
import { setDocsUnlocked } from "../docsUnlock.js";
import { PAGES, GROUPS, getConfirms } from "./content.js";
import { FLOWS, loadDocsContent } from "./registry.js";
import { pageToMarkdown } from "./text.js";
import { GROUP_ICON, PageIcon, pageIcon } from "./icons.js";
import { useDocsTheme } from "./theme.js";
import SearchBox from "./SearchBox.jsx";
import Palette from "./Palette.jsx";
import HelperPanel from "./HelperPanel.jsx";
import { useHelper } from "./helper.js";
import { Block } from "./blocks.jsx";
import DocsHome from "./DocsHome.jsx";
import "./docs.css";
import "./docs-ui.css";

const VISITED_KEY = "rc_docs_visited";
const RECENT_KEY = "rc_docs_recent";
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
      {GROUPS.map((group) => {
        const GIcon = GROUP_ICON[group];
        return (
          <div key={group} className="dx-toc-group">
            <h5>{GIcon && <GIcon size={12} aria-hidden="true" />}{group}</h5>
            {PAGES.filter((pg) => pg.group === group).map((pg) => {
              const Icon = pageIcon(pg);
              return (
                <div key={pg.id}>
                  <button type="button" className={`dx-toc-item${pg.id === currentId ? " on" : ""}${visited.includes(pg.id) ? " seen" : ""}`} onClick={() => onPick(pg.id)}>
                    <Icon size={15} aria-hidden="true" /><span>{pg.title}</span>
                  </button>
                  {pg.id === currentId && current && current.blocks.filter((b) => b.type === "h2").map((b) => (
                    <button type="button" key={b.text} className="dx-toc-sub" onClick={() => onAnchor(b.text)}>{b.text}</button>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </nav>
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

function PageActions({ page, onAsk }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const text = pageToMarkdown(page, FLOWS);
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  };
  return (
    <div className="dx-actions">
      <button type="button" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy page"}</button>
      <button type="button" className="ai" onClick={onAsk}><Sparkles size={14} />Ask about this page</button>
    </div>
  );
}

function Article({ page, onPickPage, onAsk, scrollRef }) {
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
    <article className="dx-article dx-page-in" ref={bodyRef} key={page.id}>
      <span className="dx-kicker"><PageIcon page={page} size={13} />{page.group}</span>
      <h1>{page.title}</h1>
      <p className="dx-lead">{page.summary}</p>
      <PageActions page={page} onAsk={onAsk} />
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
  const [theme, toggleTheme] = useDocsTheme();
  const helper = useHelper();
  const [openId, setOpenId] = useState(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [palette, setPalette] = useState(null);
  const [helperOpen, setHelperOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visited, setVisited] = useState(() => { try { return JSON.parse(store.get(VISITED_KEY) || "[]"); } catch { return []; } });
  const [recents, setRecents] = useState(() => { try { return JSON.parse(store.get(RECENT_KEY) || "[]").filter((id) => PAGES.some((p) => p.id === id)); } catch { return []; } });
  const scrollRef = useRef(null);
  const pendingAnchor = useRef("");

  const index = PAGES.findIndex((pg) => pg.id === openId);
  const page = index >= 0 ? PAGES[index] : null;

  useBackLayer(openId !== null, () => setOpenId(null));
  useBackLayer(tocOpen && !wide, () => setTocOpen(false));

  const openPage = useCallback((id, anchorText = "") => {
    pendingAnchor.current = anchorText;
    setOpenId(id);
    setTocOpen(false);
    setPalette(null);
    setVisited((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      store.set(VISITED_KEY, JSON.stringify(next));
      return next;
    });
    setRecents((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 6);
      store.set(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const openPalette = useCallback((detail = {}) => setPalette({ mode: detail.mode || "search", origin: detail.origin || null }), []);

  useEffect(() => {
    const onKey = (event) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName || "") || event.target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openPalette(); }
      else if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) { event.preventDefault(); openPalette(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPalette]);

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
  const askAboutPage = () => setHelperOpen(true);
  const showSide = wide && !helperOpen;

  return (
    <div className="dx-root" data-dx-theme={theme}>
      <header className="dx-bar">
        <button type="button" className="dx-icon" onClick={back} aria-label="Back"><ArrowLeft size={18} /></button>
        {wide || !page ? (
          <div className="dx-brand"><span className="dx-logo"><BookMarked size={16} /></span><strong>Handbook</strong></div>
        ) : (
          <div className="dx-bar-title"><strong>{page.title}</strong><span>{page.group}</span></div>
        )}
        {wide ? <div className="dx-bar-search"><SearchBox variant="bar" onOpen={openPalette} /></div> : <div className="dx-spacer" />}
        {!wide && <button type="button" className="dx-icon" onClick={() => openPalette()} aria-label="Search"><Search size={18} /></button>}
        <button type="button" className="dx-icon" onClick={() => setHelperOpen((v) => !v)} aria-label="Docs Helper" aria-pressed={helperOpen}>{wide ? <PanelRight size={18} /> : <Sparkles size={18} />}</button>
        <button type="button" className="dx-icon" onClick={toggleTheme} aria-label={theme === "light" ? "Switch to dark" : "Switch to light"}>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button>
        {!wide && <button type="button" className="dx-icon" onClick={() => setTocOpen(true)} aria-label="Table of contents"><List size={18} /></button>}
        <div className="dx-progress" aria-hidden="true"><i style={{ transform: `scaleX(${page ? progress : 0})` }} /></div>
      </header>

      <div className="dx-body">
        {showSide && <aside className="dx-side"><Toc currentId={openId} visited={visited} onPick={openPage} onAnchor={scrollToHeading} current={page} /></aside>}
        <div className="dx-scroll" ref={scrollRef} onScroll={onScroll}>
          {page ? (
            <>
              <Article page={page} onPickPage={openPage} onAsk={askAboutPage} scrollRef={scrollRef} />
              <footer className="dx-pager">
                {prev ? <button type="button" onClick={() => openPage(prev.id)}><ChevronLeft size={16} /><span><em>Previous</em>{prev.title}</span></button> : <i />}
                {next ? <button type="button" className="next" onClick={() => openPage(next.id)}><span><em>Next</em>{next.title}</span><ChevronRight size={16} /></button> : <i />}
              </footer>
            </>
          ) : (
            <DocsHome pages={PAGES} groups={GROUPS} visited={visited} recents={recents} onOpen={openPage} onSearch={openPalette} onHide={hideDocs} />
          )}
        </div>
        {wide && helperOpen && <aside className="dx-helper-side"><HelperPanel wide theme={theme} helper={helper} page={page} onOpen={openPage} onClose={() => setHelperOpen(false)} /></aside>}
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
      {!wide && helperOpen && <HelperPanel theme={theme} helper={helper} page={page} onOpen={openPage} onClose={() => setHelperOpen(false)} />}
      {palette && <Palette theme={theme} helper={helper} recents={recents} pageId={openId} initialMode={palette.mode} origin={palette.origin} onOpen={openPage} onClose={() => setPalette(null)} />}
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