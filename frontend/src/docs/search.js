import { blockText, slugify } from "./text.js";

export const SCOPES = [
  { id: "all", label: "All" },
  { id: "tour", label: "Product tour", match: (p) => p.group === "Product tour" },
  { id: "arch", label: "Architecture", match: (p) => p.group === "Architecture" },
  { id: "deploy", label: "Deployment", match: (p) => p.group === "Run it" && p.id !== "ops-runbook" },
  { id: "env", label: "Environment variables", match: (p) => p.id === "ref-env" },
  { id: "runbook", label: "Runbook", match: (p) => p.id === "ops-runbook" },
  { id: "changelog", label: "Changelog", match: (p) => p.id === "ref-changelog" },
];

const words = (text) => String(text).toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean);

// Edit distance of 1 (insert, delete, substitute, swap) is enough to forgive typical typos.
function within(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  let prev2 = null;
  let row = prev;
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    for (let j = 1; j <= b.length; j += 1) {
      let v = Math.min(row[j] + 1, cur[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
    }
    prev2 = row;
    row = cur;
  }
  return row[b.length] <= max;
}

// Returns a score for how well query word q matches token t (0 = no match).
function wordScore(q, t) {
  if (t === q) return 3;
  if (t.startsWith(q)) return 2.4;
  if (q.length >= 3 && t.includes(q)) return 1.6;
  if (q.length >= 4 && within(q, t.slice(0, q.length + 1), q.length >= 7 ? 2 : 1)) return 1.2;
  return 0;
}

export function highlightRanges(text, queryWords) {
  const lower = text.toLowerCase();
  const ranges = [];
  for (const q of queryWords) {
    let from = 0;
    for (;;) {
      const at = lower.indexOf(q, from);
      if (at < 0) break;
      ranges.push([at, at + q.length]);
      from = at + q.length;
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  return merged;
}

export function buildSearch(pages, flows = {}) {
  const entries = [];
  for (const page of pages) {
    let heading = "";
    let text = page.summary || "";
    const flush = () => {
      entries.push({
        id: page.id, title: page.title, group: page.group, heading,
        anchor: heading ? slugify(heading) : "", page,
        titleTokens: words(`${page.title} ${heading}`),
        bodyTokens: new Set(words(text)),
        snippet: text.replace(/\s+/g, " ").slice(0, 140),
      });
    };
    for (const block of page.blocks) {
      if (block.type === "h2") { flush(); heading = block.text; text = ""; } else text += ` ${blockText(block, flows)}`;
    }
    flush();
  }

  return function searchDocs(query, { scope = "all", limit = 14 } = {}) {
    const q = words(query);
    if (!q.length) return [];
    const scoped = SCOPES.find((s) => s.id === scope)?.match;
    const seen = new Map();
    for (const e of entries) {
      if (scoped && !scoped(e.page)) continue;
      let score = 0;
      let matched = 0;
      for (const w of q) {
        const inTitle = Math.max(0, ...e.titleTokens.map((t) => wordScore(w, t)));
        let inBody = 0;
        for (const t of e.bodyTokens) { const s = wordScore(w, t); if (s > inBody) inBody = s; if (inBody >= 3) break; }
        const best = Math.max(inTitle * 3, inBody);
        if (best > 0) { matched += 1; score += best; }
      }
      if (matched < Math.ceil(q.length * 0.67)) continue;
      if (matched === q.length) score += 2;
      if (e.heading) score -= 0.5;
      const key = `${e.id}`;
      const prev = seen.get(key);
      if (!prev || score > prev.score) {
        seen.set(key, { id: e.id, title: e.title, group: e.group, heading: e.heading, anchor: e.anchor, snippet: e.snippet, score, words: q });
      }
    }
    return [...seen.values()].sort((a, b) => b.score - a.score).slice(0, limit);
  };
}
