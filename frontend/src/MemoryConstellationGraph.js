import { buildLocalGemEchoes, MAX_ECHOES_PER_GEM } from "./gemSemantics.js";
import { gemPairSignature } from "./gemEchoClient.js";

const TAU = Math.PI * 2;
const BOOK_COLORS = [
  ["#8B5CF6", "#6366F1"], ["#22D3EE", "#0EA5E9"], ["#F59E0B", "#EF4444"],
  ["#34D399", "#10B981"], ["#F472B6", "#EC4899"], ["#A78BFA", "#7C3AED"],
];
const LOOSE = ["#94A3B8", "#64748B"];

export const MIND_MAP_UNFILED_ID = "__unfiled__";

const pairKey = (a, b) => [String(a), String(b)].sort().join("|");
const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};
const normalizeBookKey = (value) => String(value || "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();
const toSlugKey = (value) => normalizeBookKey(value).replace(/\s+/g, "-");
const stripTimestampSuffix = (value) => String(value || "").trim().replace(/-\d{10,}$/, "");

function addAlias(map, alias, bookId) {
  if (!alias) return;
  if (!map.has(alias)) map.set(alias, new Set());
  map.get(alias).add(bookId);
}

function buildBookAliasMap(books) {
  const aliases = new Map();
  books.forEach((book) => {
    const keys = new Set([
      String(book.id || "").trim(),
      stripTimestampSuffix(book.id),
      normalizeBookKey(book.title),
      toSlugKey(book.title),
      normalizeBookKey(stripTimestampSuffix(book.id)),
      toSlugKey(stripTimestampSuffix(book.id)),
    ].filter(Boolean));
    keys.forEach((key) => addAlias(aliases, key, book.id));
  });
  return aliases;
}

function resolveGemBookId(gem, groups, aliasMap) {
  const directId = String(gem?.bookId || "").trim();
  if (directId && groups.has(directId)) return directId;
  const candidates = [
    directId,
    stripTimestampSuffix(directId),
    normalizeBookKey(gem?.bookTitle),
    toSlugKey(gem?.bookTitle),
    normalizeBookKey(directId),
    toSlugKey(directId),
  ].filter(Boolean);
  for (const key of candidates) {
    const match = aliasMap.get(key);
    if (match?.size === 1) return [...match][0];
  }
  return null;
}

export function buildMindMapGraph(books, gems, verifiedEchoes = []) {
  const nodes = [];
  const links = [];
  const adj = new Map();
  const echoes = new Map();
  const echoReasons = new Map();
  const echoMeta = new Map();
  const add = (m, a, b) => {
    if (!m.has(a)) m.set(a, new Set());
    m.get(a).add(b);
  };
  const link = (a, b, kind, meta = {}) => {
    const { source: origin, ...rest } = meta;
    links.push({ ...rest, ...(origin ? { origin } : {}), source: a, target: b, kind });
    add(adj, a, b);
    add(adj, b, a);
    if (kind === "echo") {
      add(echoes, a, b);
      add(echoes, b, a);
      const key = pairKey(a, b);
      echoMeta.set(key, meta);
      if (meta.reason) echoReasons.set(key, meta.reason);
    }
  };

  const groups = new Map(books.map((book) => [book.id, []]));
  const aliasMap = buildBookAliasMap(books);
  const orphans = [];
  gems.forEach((gem) => {
    const bookId = resolveGemBookId(gem, groups, aliasMap);
    (bookId ? groups.get(bookId) : orphans).push(gem);
  });

  const count = books.length;
  const ring = count <= 1 ? 0 : Math.max(150, 120 / Math.sin(Math.PI / count));
  books.forEach((book, index) => {
    const angle = count <= 1 ? 0 : (index / count) * TAU - Math.PI / 2;
    const bookX = Math.cos(angle) * ring;
    const bookY = Math.sin(angle) * ring;
    const bookGems = groups.get(book.id).slice().sort((left, right) => (Number(left.chapterNumber) || 0) - (Number(right.chapterNumber) || 0));
    const gemCount = bookGems.length;
    const orbitA = 52 + Math.min(gemCount, 14) * 1.6;
    const orbitB = orbitA + 22;
    const colors = BOOK_COLORS[index % BOOK_COLORS.length];
    nodes.push({
      id: `book:${book.id}`,
      type: "book",
      label: book.title,
      data: book,
      c: colors,
      x: bookX,
      y: bookY,
      fx: bookX,
      fy: bookY,
      orbit: [orbitA, orbitB],
      count: gemCount,
    });
    bookGems.forEach((gem, gemIndex) => {
      const angleOffset = (gemIndex / Math.max(gemCount, 1)) * TAU + index * 0.9;
      const radius = gemIndex % 2 ? orbitB : orbitA;
      const gemX = bookX + Math.cos(angleOffset) * radius;
      const gemY = bookY + Math.sin(angleOffset) * radius;
      nodes.push({
        id: `gem:${gem.id}`,
        type: "gem",
        label: gem.summary || gem.quote,
        data: gem,
        c: colors,
        bid: book.id,
        x: gemX,
        y: gemY,
        fx: gemX,
        fy: gemY,
        phase: (hash(String(gem.id)) % 628) / 100,
      });
      link(`book:${book.id}`, `gem:${gem.id}`, "own", { anchor: true });
    });
  });

  if (orphans.length) {
    const orbitA = 58 + Math.min(orphans.length, 14) * 1.8;
    const orbitB = orbitA + 24;
    const hubY = count ? ring + 210 : 0;
    nodes.push({
      id: `book:${MIND_MAP_UNFILED_ID}`,
      type: "book",
      label: "Unfiled gems",
      data: { id: MIND_MAP_UNFILED_ID, title: "Unfiled gems", authorName: "" },
      c: LOOSE,
      x: 0,
      y: hubY,
      fx: 0,
      fy: hubY,
      orbit: [orbitA, orbitB],
      count: orphans.length,
      synthetic: true,
      fallback: true,
    });
    orphans.forEach((gem, index) => {
      const angle = (index / Math.max(orphans.length, 1)) * TAU + Math.PI / 6;
      const radius = index % 2 ? orbitB : orbitA;
      const gemX = Math.cos(angle) * radius;
      const gemY = hubY + Math.sin(angle) * radius;
      nodes.push({
        id: `gem:${gem.id}`,
        type: "gem",
        label: gem.summary || gem.quote,
        data: gem,
        c: LOOSE,
        bid: MIND_MAP_UNFILED_ID,
        x: gemX,
        y: gemY,
        fx: gemX,
        fy: gemY,
        phase: (hash(String(gem.id)) % 628) / 100,
      });
      link(`book:${MIND_MAP_UNFILED_ID}`, `gem:${gem.id}`, "own", { anchor: true, fallback: true });
    });
  }

  const gemNodes = nodes.filter((node) => node.type === "gem");
  const candidates = [];
  const semanticGems = gemNodes.map((node) => ({ ...node.data, bookId: node.bid || node.data.bookId }));
  const gemsById = new Map(gems.map((gem) => [String(gem.id), gem]));
  const decisions = new Map(verifiedEchoes.map((echo) => [pairKey(echo.a, echo.b), echo]));
  for (const localEcho of buildLocalGemEchoes(semanticGems)) {
    let decision = decisions.get(pairKey(localEcho.a, localEcho.b));
    if (decision?.signature !== gemPairSignature(gemsById.get(localEcho.a), gemsById.get(localEcho.b))) decision = null;
    if (decision && !decision.accepted) continue;
    candidates.push(decision?.accepted ? decision : localEcho);
  }

  candidates.sort((left, right) => right.score - left.score);
  const nodeIds = new Set(gemNodes.map((node) => String(node.data.id)));
  const seenEcho = new Set();
  const degree = new Map();
  for (const candidate of candidates) {
    const left = `gem:${candidate.a}`;
    const right = `gem:${candidate.b}`;
    const key = pairKey(left, right);
    if (left === right || !nodeIds.has(candidate.a) || !nodeIds.has(candidate.b) || seenEcho.has(key)) continue;
    if ((degree.get(candidate.a) || 0) >= MAX_ECHOES_PER_GEM || (degree.get(candidate.b) || 0) >= MAX_ECHOES_PER_GEM) continue;
    seenEcho.add(key);
    degree.set(candidate.a, (degree.get(candidate.a) || 0) + 1);
    degree.set(candidate.b, (degree.get(candidate.b) || 0) + 1);
    link(left, right, "echo", {
      score: candidate.score,
      sharedThemes: candidate.sharedThemes || [],
      reason: candidate.reason || "Related ideas across books",
      source: candidate.source,
    });
  }

  return { graph: { nodes, links }, adj, echoes, echoCount: seenEcho.size, echoReasons, echoMeta };
}
