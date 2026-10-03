import { AnimatePresence, motion as Motion, useDragControls } from "framer-motion";
import { BookOpen, Gem, Info, Link2, Maximize2, Shuffle, X as XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { apiUrl } from "./api.js";
import "./MemoryConstellation.css";

const TAU = Math.PI * 2;
const BOOK_COLORS = [
  ["#8B5CF6", "#6366F1"], ["#22D3EE", "#0EA5E9"], ["#F59E0B", "#EF4444"],
  ["#34D399", "#10B981"], ["#F472B6", "#EC4899"], ["#A78BFA", "#7C3AED"],
];
const LOOSE = ["#94A3B8", "#64748B"];
const STOP = new Set("about above after again being could every first found great their there these thing those through where which while would should always because before between little never other really still than that them then they this very what when with your yourself".split(" "));

// ---------- Mock data ----------
const MOCK_BOOKS = [
  { id: "atomic", title: "Atomic Habits", authorName: "James Clear" },
  { id: "alchemist", title: "The Alchemist", authorName: "Paulo Coelho" },
  { id: "courage", title: "The Courage to Be Disliked", authorName: "Ichiro Kishimi and Fumitake Koga" },
];
const MOCK_GEMS = [
  { id: "g1", bookId: "atomic", bookTitle: "Atomic Habits", chapterNumber: 1, quote: "You do not rise to the level of your goals. You fall to the level of your systems.", takeawaySituation: "You set a big goal every January and drop it by February.", takeawaySteps: ["Pick one tiny daily action", "Attach it to something you already do", "Track it with a simple tick"], takeawayExample: "After morning chai, read one page.", takeawayWhyItMatters: "Systems keep working on the days motivation doesn't." },
  { id: "g2", bookId: "atomic", bookTitle: "Atomic Habits", chapterNumber: 4, quote: "Every action you take is a vote for the type of person you wish to become.", takeawaySituation: "You skip the gym because 'one day won't matter'.", takeawaySteps: ["Ask: what would the person I want to be do now?", "Do the 2-minute version"], takeawayWhyItMatters: "Identity is built from small repeated votes." },
  { id: "g3", bookId: "atomic", bookTitle: "Atomic Habits", chapterNumber: 7, quote: "Make it obvious, make it attractive, make it easy, make it satisfying.", takeaway: "Use the four laws to design any habit you want to keep." },
  { id: "g4", bookId: "alchemist", bookTitle: "The Alchemist", chapterNumber: 2, quote: "When you want something, all the universe conspires in helping you to achieve it.", takeaway: "Take the first concrete step. Momentum attracts help." },
  { id: "g5", bookId: "alchemist", bookTitle: "The Alchemist", chapterNumber: 5, quote: "The fear of suffering is worse than the suffering itself.", takeaway: "Name what you fear, then do the smallest version of it today." },
  { id: "g6", bookId: "courage", bookTitle: "The Courage to Be Disliked", chapterNumber: 3, quote: "All problems are interpersonal relationship problems.", takeaway: "Separate your tasks from other people's tasks before reacting." },
  { id: "g7", bookId: "courage", bookTitle: "The Courage to Be Disliked", chapterNumber: 3, quote: "Freedom is being disliked by other people.", takeaway: "Pick one decision this week and make it without seeking approval." },
  { id: "g8", bookId: "alchemist", bookTitle: "The Alchemist", chapterNumber: 6, quote: "Fear of suffering keeps people from taking the first step toward their dream.", takeaway: "Take one small step toward the thing you keep postponing." },
];

// ---------- Helpers ----------
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
const clip = (text, n) => { const s = String(text || "").replace(/\s+/g, " ").trim(); return s.length > n ? `${s.slice(0, n - 1)}…` : s; };
const tokens = (text) => [...new Set((String(text || "").toLowerCase().match(/[a-z]{5,}/g) || []).filter((w) => !STOP.has(w)))];
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function drawLabel(ctx, text, x, y, fs, weight, color, scale, light) {
  ctx.font = `${weight} ${fs}px Manrope, system-ui, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.lineJoin = "round";
  ctx.lineWidth = 3 / scale;
  ctx.strokeStyle = light ? "rgba(245,242,252,.92)" : "rgba(5,5,8,.85)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

// ---------- Semantic echoes (backend-judged idea links between books) ----------
const ECHO_CACHE_KEY = "rc_gem_echoes_v2";
const pairKey = (a, b) => [String(a), String(b)].sort().join("|");
function loadEchoCache() { try { return JSON.parse(localStorage.getItem(ECHO_CACHE_KEY) || "{}"); } catch { return {}; } }
function saveEchoCache(cache) { try { localStorage.setItem(ECHO_CACHE_KEY, JSON.stringify(cache)); } catch { /* storage full */ } }
function resolvedBookKey(gem, books, byTitle) {
  if (gem.bookId && books.some((b) => b.id === gem.bookId)) return gem.bookId;
  const byT = byTitle.get(String(gem.bookTitle || "").toLowerCase());
  return byT || `unknown:${String(gem.bookTitle || gem.id).toLowerCase()}`;
}

// Fixed "orbit" layout: books on a ring, gems orbit their book. No physics, so it is stable.
function buildGraph(books, gems, semanticPairs = []) {
  const nodes = [], links = [], adj = new Map(), echoes = new Map(), echoReasons = new Map();
  const add = (m, a, b) => { if (!m.has(a)) m.set(a, new Set()); m.get(a).add(b); };
  const link = (a, b, kind) => {
    links.push({ source: a, target: b, kind });
    add(adj, a, b); add(adj, b, a);
    if (kind === "echo") { add(echoes, a, b); add(echoes, b, a); }
  };
  const groups = new Map(books.map((b) => [b.id, []]));
  const byTitle = new Map(books.map((b) => [String(b.title).toLowerCase(), b.id]));
  const orphans = [];
  gems.forEach((g) => {
    const bid = groups.has(g.bookId) ? g.bookId : byTitle.get(String(g.bookTitle || "").toLowerCase());
    (bid ? groups.get(bid) : orphans).push(g);
  });

  const n = books.length;
  const ring = n <= 1 ? 0 : Math.max(150, 120 / Math.sin(Math.PI / n));
  books.forEach((b, i) => {
    const a = n <= 1 ? 0 : (i / n) * TAU - Math.PI / 2;
    const bx = Math.cos(a) * ring, by = Math.sin(a) * ring;
    const list = groups.get(b.id).slice().sort((x, y) => (Number(x.chapterNumber) || 0) - (Number(y.chapterNumber) || 0));
    const m = list.length;
    const r1 = 52 + Math.min(m, 14) * 1.6, r2 = r1 + 22;
    const c = BOOK_COLORS[i % BOOK_COLORS.length];
    nodes.push({ id: `book:${b.id}`, type: "book", label: b.title, data: b, c, x: bx, y: by, fx: bx, fy: by, orbit: [r1, r2], count: m });
    list.forEach((g, k) => {
      const ang = (k / Math.max(m, 1)) * TAU + i * 0.9;
      const r = k % 2 ? r2 : r1;
      const gx = bx + Math.cos(ang) * r, gy = by + Math.sin(ang) * r;
      nodes.push({ id: `gem:${g.id}`, type: "gem", label: g.summary || g.quote, data: g, c, bid: b.id, x: gx, y: gy, fx: gx, fy: gy, phase: (hash(String(g.id)) % 628) / 100 });
      link(`book:${b.id}`, `gem:${g.id}`, "own");
    });
  });
  orphans.forEach((g, k) => {
    const ang = (k / orphans.length) * TAU, r = ring + 190;
    const gx = Math.cos(ang) * r, gy = Math.sin(ang) * r;
    nodes.push({ id: `gem:${g.id}`, type: "gem", label: g.summary || g.quote, data: g, c: LOOSE, bid: null, x: gx, y: gy, fx: gx, fy: gy, phase: (hash(String(g.id)) % 628) / 100 });
  });

  // echoes: gems from different books that share ideas
  const gn = nodes.filter((x) => x.type === "gem");
  gn.forEach((x) => { x.tok = tokens(x.data.quote); });
  let echoCount = 0;
  for (let i = 0; i < gn.length && echoCount < 40; i++) {
    for (let j = i + 1; j < gn.length && echoCount < 40; j++) {
      const a = gn[i], b = gn[j];
      if (a.bid && a.bid === b.bid) continue;
      const shared = a.tok.filter((w) => b.tok.includes(w));
      if (shared.length >= 2 || shared.some((w) => w.length >= 8)) { link(a.id, b.id, "echo"); echoCount += 1; }
    }
  }

  // semantic echoes: cross-book pairs the language model confirmed share one idea
  const nodeIds = new Set(nodes.map((x) => x.id));
  const seenEcho = new Set(links.filter((l) => l.kind === "echo").map((l) => pairKey(String(l.source), String(l.target))));
  for (const p of semanticPairs) {
    const a = `gem:${p.a}`, b = `gem:${p.b}`;
    const k = pairKey(a, b);
    if (a === b || !nodeIds.has(a) || !nodeIds.has(b) || seenEcho.has(k)) continue;
    seenEcho.add(k);
    link(a, b, "echo");
    echoCount += 1;
    if (p.reason) echoReasons.set(k, p.reason);
  }
  return { graph: { nodes, links }, adj, echoes, echoCount, echoReasons };
}

// ---------- Component ----------
export default function MemoryConstellation({ books = [], gems = [], paused = false }) {
  const demo = books.length === 0 && gems.length === 0;
  const gemsKey = gems.map((g) => g.id).sort().join(",");
  const [semPairs, setSemPairs] = useState([]);
  const { graph, adj, echoes, echoCount, echoReasons } = useMemo(
    () => (demo ? buildGraph(MOCK_BOOKS, MOCK_GEMS) : buildGraph(books, gems, semPairs)),
    [books, gems, demo, semPairs]
  );

  // Ask the backend's language model which cross-book gem pairs share an idea.
  // Every pair is judged exactly once and cached in localStorage; "no link"
  // verdicts are cached too so we never re-ask the same pair.
  useEffect(() => {
    if (demo || gems.length < 2) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const byTitle = new Map(books.map((b) => [String(b.title).toLowerCase(), b.id]));
      const keyOf = (g) => resolvedBookKey(g, books, byTitle);
      const cache = loadEchoCache();
      const yesPairs = [];
      const unknown = [];
      for (let i = 0; i < gems.length; i++) {
        for (let j = i + 1; j < gems.length; j++) {
          const a = gems[i], b = gems[j];
          if (keyOf(a) === keyOf(b)) continue; // same book: never an echo
          const hit = cache[pairKey(a.id, b.id)];
          if (hit) { if (hit.on) yesPairs.push({ a: a.id, b: b.id, reason: hit.reason || "" }); }
          else unknown.push([a, b]);
        }
      }
      if (cancelled) return;
      setSemPairs(yesPairs);
      if (!unknown.length) return;
      const involved = new Map();
      unknown.slice(0, 200).forEach(([a, b]) => { involved.set(a.id, a); involved.set(b.id, b); });
      const payload = [...involved.values()].slice(0, 40)
        .map((g) => ({ id: g.id, bookTitle: g.bookTitle, quote: g.quote, takeaway: g.takeaway || "" }));
      try {
        const res = await fetch(apiUrl("/api/gem-echoes"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gems: payload }),
        });
        const data = await res.json();
        if (cancelled) return;
        const got = new Set();
        const fresh = [];
        for (const p of Array.isArray(data?.pairs) ? data.pairs : []) {
          const [a, b, reason] = p;
          if (!involved.has(a) || !involved.has(b)) continue;
          got.add(pairKey(a, b));
          cache[pairKey(a, b)] = { on: true, reason: String(reason || "") };
          fresh.push({ a, b, reason: String(reason || "") });
        }
        for (const [a, b] of unknown) {
          const k = pairKey(a.id, b.id);
          if (!got.has(k) && cache[k] === undefined) cache[k] = { on: false };
        }
        saveEchoCache(cache);
        setSemPairs((prev) => {
          const merged = [...prev];
          for (const p of fresh) if (!prev.some((q) => pairKey(q.a, q.b) === pairKey(p.a, p.b))) merged.push(p);
          return merged;
        });
      } catch { /* backend offline - keyword echoes still work */ }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gemsKey, books, demo]);

  const wrapRef = useRef(null);
  const fgRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [selectedId, setSelectedId] = useState(null);
  const [showEcho, setShowEcho] = useState(true);
  const [light, setLight] = useState(() => document.documentElement.getAttribute("data-theme") === "light");
  const [infoOpen, setInfoOpen] = useState(() => { try { return !localStorage.getItem("cc_info_seen"); } catch { return true; } });

  const closeInfo = () => { setInfoOpen(false); try { localStorage.setItem("cc_info_seen", "1"); } catch { /* ignore */ } };

  // follow the app theme
  useEffect(() => {
    const el = document.documentElement;
    const mo = new MutationObserver(() => setLight(el.getAttribute("data-theme") === "light"));
    mo.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  const nodeById = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);
  const bookNodes = useMemo(() => graph.nodes.filter((n) => n.type === "book"), [graph]);
  const gemNodes = useMemo(() => graph.nodes.filter((n) => n.type === "gem"), [graph]);
  const selected = selectedId ? nodeById.get(selectedId) : null;
  const connected = useMemo(() => (selectedId ? new Set([selectedId, ...(adj.get(selectedId) || [])]) : null), [selectedId, adj]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // fit the whole sky once the canvas exists
  useEffect(() => {
    if (!size.w) return undefined;
    const id = setTimeout(() => fgRef.current?.zoomToFit(0, 60), 250);
    return () => clearTimeout(id);
  }, [graph, size.w, size.h]);

  const focusNode = useCallback((node) => {
    if (!node || !Number.isFinite(node.x)) return;
    setSelectedId(node.id);
    const fg = fgRef.current;
    if (!fg) return;
    const k = node.type === "book" ? 1.9 : 3.2;
    fg.centerAt(node.x, node.y + (size.h * 0.2) / k, 800);
    fg.zoom(k, 800);
  }, [size.h]);

  const closeSheet = useCallback(() => { setSelectedId(null); fgRef.current?.zoomToFit(800, 60); }, []);
  const surprise = useCallback(() => {
    const pool = gemNodes.filter((g) => g.id !== selectedId);
    if (pool.length) focusNode(pool[Math.floor(Math.random() * pool.length)]);
  }, [gemNodes, selectedId, focusNode]);

  const paintNode = useCallback((node, ctx, scale) => {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
    const { x, y } = node;
    const [c1, c2] = node.c;
    const isSel = node.id === selectedId;
    const dim = connected && !connected.has(node.id);
    const t = performance.now() / 1000;
    const labelColor = light ? "#2b2250" : "rgba(255,255,255,.92)";
    ctx.globalAlpha = dim ? 0.2 : 1;

    if (node.type === "book") {
      const w = 24, h = 32;
      const halo = ctx.createRadialGradient(x, y, 0, x, y, h * 2.4);
      halo.addColorStop(0, rgba(c1, light ? 0.26 : 0.45)); halo.addColorStop(1, rgba(c1, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, h * 2.4, 0, TAU); ctx.fill();

      ctx.save();
      ctx.setLineDash([2, 6]); ctx.lineDashOffset = -t * 5; ctx.lineWidth = 0.9;
      ctx.strokeStyle = rgba(c1, light ? 0.4 : 0.32);
      node.orbit.forEach((r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); });
      ctx.restore();

      ctx.shadowColor = rgba(c1, 0.85); ctx.shadowBlur = light ? 10 : 18;
      const g = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g; rr(ctx, x - w / 2, y - h / 2, w, h, 4); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(x - w / 2 + 4.5, y - h / 2 + 2); ctx.lineTo(x - w / 2 + 4.5, y + h / 2 - 2); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fillRect(x - w / 2 + 7, y - h / 2 + 4, w - 12, 1.6);
      ctx.fillStyle = "#fff"; ctx.font = "700 14px Fraunces, Georgia, serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText((node.label || "?").trim()[0]?.toUpperCase() || "?", x + 2, y + 1);
      if (isSel) {
        ctx.strokeStyle = rgba(c1, 0.55 + 0.35 * Math.sin(t * 4)); ctx.lineWidth = 1.6;
        rr(ctx, x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8, 7); ctx.stroke();
      }
      drawLabel(ctx, clip(node.label, 24), x, y + h / 2 + 4 / scale, 11 / scale, 700, labelColor, scale, light);
    } else {
      const pulse = 1 + 0.06 * Math.sin(t * 1.6 + node.phase);
      const s = (isSel ? 8.5 : 7) * pulse;
      const halo = ctx.createRadialGradient(x, y, 0, x, y, s * 3.4);
      halo.addColorStop(0, rgba(c1, light ? 0.32 : 0.55)); halo.addColorStop(1, rgba(c1, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, s * 3.4, 0, TAU); ctx.fill();

      ctx.shadowColor = rgba(c1, 0.9); ctx.shadowBlur = light ? 6 : 14;
      const g = ctx.createLinearGradient(x - s, y - s, x + s, y + s);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.95, y - s * 0.2); ctx.lineTo(x, y + s * 1.15); ctx.lineTo(x - s * 0.95, y - s * 0.2);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,.38)";
      ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x - s * 0.95, y - s * 0.2); ctx.lineTo(x - s * 0.3, y - s * 0.2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.95, y - s * 0.2); ctx.lineTo(x + s * 0.95, y - s * 0.2);
      ctx.moveTo(x - s * 0.3, y - s * 0.2); ctx.lineTo(x, y + s * 1.15);
      ctx.moveTo(x + s * 0.3, y - s * 0.2); ctx.lineTo(x, y + s * 1.15);
      ctx.stroke();

      const tw = 0.5 + 0.5 * Math.sin(t * 2 + node.phase);
      if (tw > 0.55) {
        const sx = x + s * 1.2, sy = y - s * 1.2, q = 3.2 * tw;
        ctx.strokeStyle = light ? rgba(c1, tw) : `rgba(255,255,255,${tw})`; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(sx - q, sy); ctx.lineTo(sx + q, sy); ctx.moveTo(sx, sy - q); ctx.lineTo(sx, sy + q); ctx.stroke();
      }
      if (isSel) {
        ctx.strokeStyle = rgba(c1, 0.9); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(x, y + s * 0.1, s * 2.1 + Math.sin(t * 4) * 1.2, 0, TAU); ctx.stroke();
      }
      if (isSel || scale > 2.4) drawLabel(ctx, clip(node.label, 32), x, y + s * 1.15 + 5 / scale, 9 / scale, 600, labelColor, scale, light);
    }
    ctx.globalAlpha = 1;
  }, [selectedId, connected, light]);

  const paintLink = useCallback((l, ctx) => {
    const s = l.source, e = l.target;
    if (typeof s !== "object" || typeof e !== "object") return;
    if (![s.x, s.y, e.x, e.y].every(Number.isFinite)) return;
    const echo = l.kind === "echo";
    if (echo && !showEcho) return;
    const active = !selectedId || s.id === selectedId || e.id === selectedId;

    if (!echo) {
      // ordinary book -> gem tether: thin, calm
      const a = active ? 0.8 : 0.12;
      const g = ctx.createLinearGradient(s.x, s.y, e.x, e.y);
      g.addColorStop(0, rgba(s.c[0], a)); g.addColorStop(1, rgba(e.c[1], a));
      ctx.strokeStyle = g; ctx.lineWidth = active ? 1 : 0.5;
      if (!light && active) { ctx.shadowColor = rgba(e.c[0], 0.8); ctx.shadowBlur = 8; }
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke(); ctx.shadowBlur = 0;
      return;
    }

    // ---------- echo bridge: a neon energy arc between two matching ideas ----------
    const t = performance.now() / 1000;
    const dx = e.x - s.x, dy = e.y - s.y;
    const mx = (s.x + e.x) / 2, my = (s.y + e.y) / 2;
    const lift = Math.min(46, Math.hypot(dx, dy) * 0.22);
    const cx = mx - dy * 0.22, cy = my + dx * 0.22 - lift;   // arc control point (raised)
    const at = (px, pt) => ({ x: (1 - pt) * (1 - pt) * s.x + 2 * (1 - pt) * pt * cx + pt * pt * e.x, y: (1 - pt) * (1 - pt) * s.y + 2 * (1 - pt) * pt * cy + pt * pt * e.y });
    const base = active ? (selectedId ? 1 : 0.75) : 0.1;
    const glowC = s.c[0], glowC2 = e.c[1];

    const trace = () => { ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.quadraticCurveTo(cx, cy, e.x, e.y); };

    // wide soft aura under everything
    const aura = ctx.createLinearGradient(s.x, s.y, e.x, e.y);
    aura.addColorStop(0, rgba(glowC, base * 0.22)); aura.addColorStop(1, rgba(glowC2, base * 0.22));
    ctx.strokeStyle = aura; ctx.lineWidth = 6.5; ctx.lineCap = "round";
    trace(); ctx.stroke();

    // neon tube: colored body + white-hot core
    const tube = ctx.createLinearGradient(s.x, s.y, e.x, e.y);
    tube.addColorStop(0, rgba(glowC, base * 0.85)); tube.addColorStop(0.5, rgba("#F472B6", base * 0.9)); tube.addColorStop(1, rgba(glowC2, base * 0.85));
    ctx.strokeStyle = tube; ctx.lineWidth = 2.4;
    if (!light) { ctx.shadowColor = rgba("#F472B6", 0.85); ctx.shadowBlur = 12; }
    trace(); ctx.stroke();
    ctx.shadowBlur = 0;
    if (active) {
      ctx.strokeStyle = light ? rgba("#ffffff", 0.5) : rgba("#ffffff", 0.75);
      ctx.lineWidth = 0.9;
      trace(); ctx.stroke();
    }

    // flowing dashes: the idea "travels" between the two books
    ctx.strokeStyle = rgba(light ? glowC : "#ffffff", base * 0.9);
    ctx.lineWidth = 2.6; ctx.lineCap = "round";
    ctx.setLineDash([1.5, 14]); ctx.lineDashOffset = -t * 26;
    trace(); ctx.stroke();
    ctx.setLineDash([]); ctx.lineCap = "butt";

    if (active) {
      // two light particles riding the arc in opposite phases
      for (const ph of [0, 0.5]) {
        const p = at(0, (t * 0.22 + ph) % 1);
        const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 7);
        pg.addColorStop(0, light ? rgba(glowC, 0.95) : "rgba(255,255,255,.95)");
        pg.addColorStop(0.4, rgba(glowC, 0.5)); pg.addColorStop(1, rgba(glowC, 0));
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, TAU); ctx.fill();
      }
      // pulsing rings at both ends: the two gems "answer" each other
      for (const [pt, col] of [[s, glowC], [e, glowC2]]) {
        const pr = ((t * 0.9) % 1);
        ctx.strokeStyle = rgba(col, (1 - pr) * 0.65 * base); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 9 + pr * 14, 0, TAU); ctx.stroke();
      }
      // the shared idea core at the arc's crown
      const mid = at(0, 0.5);
      const beat = 1 + 0.25 * Math.sin(t * 3);
      const core = ctx.createRadialGradient(mid.x, mid.y, 0, mid.x, mid.y, 9 * beat);
      core.addColorStop(0, light ? rgba("#F472B6", 0.9) : "rgba(255,255,255,.95)");
      core.addColorStop(0.45, rgba("#F472B6", 0.55)); core.addColorStop(1, rgba("#F472B6", 0));
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.arc(mid.x, mid.y, 9 * beat, 0, TAU); ctx.fill();
      ctx.fillStyle = light ? "#be185d" : "#fff";
      ctx.beginPath(); ctx.arc(mid.x, mid.y, 2.2 * beat, 0, TAU); ctx.fill();
    }
  }, [selectedId, showEcho, light]);

  const paintPointer = useCallback((node, color, ctx) => {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
    ctx.fillStyle = color;
    if (node.type === "book") ctx.fillRect(node.x - 18, node.y - 22, 36, 44);
    else { ctx.beginPath(); ctx.arc(node.x, node.y, 13, 0, TAU); ctx.fill(); }
  }, []);

  return (
    <div className={`cc-root ${light ? "light" : "dark"}`} ref={wrapRef}>
      <div className="cc-bgfx" />

      {size.w > 0 && (
        <ForceGraph2D
          ref={fgRef}
          graphData={graph}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={paintPointer}
          linkCanvasObject={paintLink}
          linkCanvasObjectMode={() => "replace"}
          enableNodeDrag={false}
          autoPauseRedraw={paused}
          cooldownTicks={1}
          minZoom={0.35}
          maxZoom={6}
          onNodeClick={focusNode}
          onBackgroundClick={() => selectedId && closeSheet()}
        />
      )}

      <header className="cc-header">
        <div className="cc-head-row">
          <div className="cc-head-text">
            <h1>Cognitive Constellation</h1>
            <p>{bookNodes.length} books · {gemNodes.length} gems · {echoCount} echoes{demo ? " · demo" : ""}</p>
          </div>
          <button className={`cc-info-btn ${infoOpen ? "on" : ""}`} onClick={() => (infoOpen ? closeInfo() : setInfoOpen(true))} aria-label="What is this?">
            <Info size={16} />
          </button>
        </div>
        <AnimatePresence initial={false}>
          {infoOpen && (
            <Motion.div className="cc-info" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }}>
              <div className="cc-info-in">
                <p className="cc-info-lead">Tumhari reading ka night sky. Har book ek planet hai, aur tumhare saved gems uske around ghoomte crystals.</p>
                <ul>
                  <li><span className="cc-ico"><i className="ico-book" /></span><span><b>Book cover</b> — Library ki ek book.</span></li>
                  <li><span className="cc-ico"><i className="ico-gem" /></span><span><b>Crystal</b> — tumhara saved gem. Tap karo, real-life application dikhegi.</span></li>
                  <li><span className="cc-ico"><i className="ico-orbit" /></span><span><b>Orbit</b> — gems apni book ke chaaron taraf, chapter order me.</span></li>
                  <li><span className="cc-ico"><i className="ico-echo" /></span><span><b>Echo</b> — dotted bridge: do alag books me same idea repeat hua.</span></li>
                </ul>
                <div className="cc-info-why">
                  <b>Isse kya milega?</b>
                  <span>• Dekho kaunsi book se kitna nichod nikala</span>
                  <span>• Shuffle se bhoole hue gems wapas yaad aate hain</span>
                  <span>• Echoes batate hain tumhari soch ke patterns kya hain</span>
                </div>
                <button className="cc-info-ok" onClick={closeInfo}>Samajh gaya</button>
              </div>
            </Motion.div>
          )}
        </AnimatePresence>
      </header>

      {!selected && (
        <>
          {bookNodes.length > 0 && (
            <div className="cc-chips">
              {bookNodes.map((b) => (
                <button key={b.id} style={{ "--c": b.c[0] }} onClick={() => focusNode(b)}><i />{clip(b.label, 18)}</button>
              ))}
            </div>
          )}
          <div className="cc-fabs">
            <button onClick={surprise} aria-label="Surprise me with a gem" title="Surprise me"><Shuffle size={16} /></button>
            <button className={showEcho ? "on" : ""} onClick={() => setShowEcho((v) => !v)} aria-label="Toggle echoes" title="Echoes"><Link2 size={16} /></button>
            <button onClick={() => fgRef.current?.zoomToFit(700, 60)} aria-label="Recenter" title="Recenter"><Maximize2 size={16} /></button>
          </div>
        </>
      )}

      <AnimatePresence>
        {selected && <Sheet key={selected.id} node={selected} nodeById={nodeById} adj={adj} echoes={echoes} echoReasons={echoReasons} onClose={closeSheet} onPick={focusNode} />}
      </AnimatePresence>
    </div>
  );
}

// ---------- Bottom sheet ----------
function Sheet({ node, nodeById, adj, echoes, echoReasons, onClose, onPick }) {
  const controls = useDragControls();
  const isBook = node.type === "book";
  const d = node.data;
  const childGems = isBook ? [...(adj.get(node.id) || [])].map((id) => nodeById.get(id)).filter(Boolean) : [];
  const echoNodes = !isBook ? [...(echoes.get(node.id) || [])].map((id) => nodeById.get(id)).filter(Boolean) : [];

  return (
    <Motion.aside
      className="cc-sheet"
      style={{ "--ac1": node.c[0], "--ac2": node.c[1] }}
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      drag="y" dragListener={false} dragControls={controls}
      dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.5 }}
      onDragEnd={(_, info) => { if (info.offset.y > 90 || info.velocity.y > 500) onClose(); }}
    >
      <div className="cc-handle" onPointerDown={(e) => controls.start(e)}><span /></div>
      <button className="cc-close" onClick={onClose} aria-label="Close"><XIcon size={16} /></button>

      <div className="cc-sheet-body">
        {isBook ? (
          <>
            <div className="cc-chip"><BookOpen size={12} /> Book</div>
            <h2>{d.title}</h2>
            {d.authorName && <p className="cc-sub">{d.authorName}</p>}
            <div className="cc-label">{childGems.length} saved gem{childGems.length === 1 ? "" : "s"}</div>
            <div className="cc-gem-list">
              {childGems.map((g) => (
                <button key={g.id} onClick={() => onPick(g)}><Gem size={13} /><span>{clip(g.data.quote, 90)}</span></button>
              ))}
              {childGems.length === 0 && <p className="cc-sub">Is book se abhi koi gem save nahi hua.</p>}
            </div>
          </>
        ) : (
          <>
            <div className="cc-chip"><Gem size={12} /> Gem</div>
            <p className="cc-book-line">{d.bookTitle}{Number.isFinite(Number(d.chapterNumber)) ? ` · Ch. ${d.chapterNumber}` : ""}</p>
            <blockquote>“{String(d.quote).trim()}”</blockquote>

            <div className="cc-label">Real-life application</div>
            {d.takeawaySituation || d.takeawaySteps?.length ? (
              <div className="cc-app">
                {d.takeawaySituation && <p>{d.takeawaySituation}</p>}
                {d.takeawaySteps?.length > 0 && <ol>{d.takeawaySteps.map((s, i) => <li key={i}>{s}</li>)}</ol>}
                {d.takeawayExample && <p className="cc-ex"><b>Example:</b> {d.takeawayExample}</p>}
                {d.takeawayWhyItMatters && <p className="cc-why">{d.takeawayWhyItMatters}</p>}
              </div>
            ) : (
              <p className="cc-app">{d.takeaway || d.application || "Keep this idea close and apply it in one small, concrete way."}</p>
            )}

            {echoNodes.length > 0 && (
              <>
                <div className="cc-label"><Link2 size={11} /> Echoes in other books</div>
                <div className="cc-gem-list">
                  {echoNodes.map((g) => {
                    const why = echoReasons?.get(pairKey(node.id, g.id));
                    return (
                      <button key={g.id} onClick={() => onPick(g)}>
                        <Gem size={13} />
                        <span>{clip(g.data.quote, 80)}<em>{g.data.bookTitle}</em>{why && <em className="cc-echo-why">Linked: {why}</em>}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Motion.aside>
  );
}