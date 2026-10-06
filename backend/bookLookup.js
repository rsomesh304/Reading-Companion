// Public book catalogue lookups. Only public details are read (title, author, ISBN, cover,
// table of contents). Nothing here reads or fetches the book itself.
const UA = "ReadingCompanion/1.0 (personal reading app)";
const MAX_ISBNS = 4;
const MAX_CHAPTERS = 200;

const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
export const norm = (s) => clean(s).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

async function getJson(fetchImpl, url, { timeoutMs = 8000 } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetchImpl(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: ctl.signal, redirect: "follow" });
    if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status });
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

function pickIsbns(list) {
  const out = [];
  for (const v of list || []) {
    const digits = String(v).replace(/[^0-9Xx]/g, "");
    if ((digits.length === 13 || digits.length === 10) && !out.includes(digits)) out.push(digits);
  }
  // ISBN-13 first: it is the most widely indexed form.
  return out.sort((a, b) => b.length - a.length).slice(0, MAX_ISBNS);
}

export function mapGoogleVolume(item) {
  const v = item?.volumeInfo || {};
  const isbns = pickIsbns((v.industryIdentifiers || []).map((i) => i.identifier));
  const cover = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || "";
  return {
    key: `g:${item?.id || ""}`,
    title: clean([v.title, v.subtitle].filter(Boolean).join(": ")),
    authors: (v.authors || []).map(clean).filter(Boolean),
    isbns,
    coverUrl: cover.replace(/^http:/, "https:").replace("&edge=curl", ""),
    year: String(v.publishedDate || "").slice(0, 4),
    source: "google",
  };
}

export function mapOpenLibraryDoc(doc) {
  return {
    key: `o:${doc?.key || ""}`,
    title: clean(doc?.title),
    authors: (doc?.author_name || []).map(clean).filter(Boolean),
    isbns: pickIsbns(doc?.isbn),
    coverUrl: doc?.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : "",
    year: doc?.first_publish_year ? String(doc.first_publish_year) : "",
    source: "openlibrary",
  };
}

async function searchGoogle(fetchImpl, title, apiKey) {
  const params = new URLSearchParams({ q: `intitle:${title}`, maxResults: "8", printType: "books", fields: "items(id,volumeInfo(title,subtitle,authors,publishedDate,industryIdentifiers,imageLinks))" });
  if (apiKey) params.set("key", apiKey);
  const j = await getJson(fetchImpl, `https://www.googleapis.com/books/v1/volumes?${params}`);
  return (j.items || []).map(mapGoogleVolume).filter((b) => b.title && b.authors.length);
}

async function searchOpenLibrary(fetchImpl, title) {
  const params = new URLSearchParams({ title, limit: "8", fields: "key,title,author_name,isbn,cover_i,first_publish_year" });
  const j = await getJson(fetchImpl, `https://openlibrary.org/search.json?${params}`);
  return (j.docs || []).map(mapOpenLibraryDoc).filter((b) => b.title);
}

function dedupe(books) {
  const seen = new Set();
  return books.filter((b) => {
    const k = `${norm(b.title)}|${norm(b.authors[0])}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Google Books first; Open Library when Google has nothing or is unavailable (for example rate limited).
export async function findBooks(title, { fetchImpl = fetch, googleKey = "" } = {}) {
  const query = clean(title).slice(0, 120);
  if (query.length < 2) return { books: [], via: null };
  let google = [];
  try { google = await searchGoogle(fetchImpl, query, googleKey); } catch { /* fall through to Open Library */ }
  if (google.length) return { books: dedupe(google).slice(0, 6), via: "google" };
  try {
    const ol = await searchOpenLibrary(fetchImpl, query);
    return { books: dedupe(ol).slice(0, 6), via: ol.length ? "openlibrary" : null };
  } catch {
    return { books: [], via: null, unavailable: true };
  }
}

// The app numbers chapters itself, so printed prefixes such as "Chapter 3" or "4." are removed.
export function cleanChapterTitle(title) {
  const original = clean(title);
  const stripped = original.replace(/^(?:chapter|chap\.?|ch\.?|part)\s*(?:\d+|[ivxlc]+)\b\s*[:.\-–—)]*\s*/i, "").replace(/^\d{1,3}\s*[:.\-–—)]\s*/, "").replace(/^\d{1,3}\s+(?=[A-Za-z])/, "").trim();
  return stripped.length >= 2 ? stripped : original;
}

export function normalizeToc(raw) {
  if (!Array.isArray(raw)) return [];
  const rows = raw
    .map((e) => {
      const title = clean(e?.title);
      const label = clean(e?.label);
      const page = Number.parseInt(String(e?.pagenum ?? "").replace(/[^0-9]/g, ""), 10);
      return { level: Number(e?.level) || 0, title: title || label, label: title ? label : "", page: Number.isFinite(page) && page > 0 ? page : null };
    })
    .filter((e) => e.title && e.title.length <= 160);
  const top = rows.filter((e) => e.level === 0);
  const chosen = top.length >= 2 ? top : rows;
  return chosen.slice(0, MAX_CHAPTERS).map((e, i) => ({ number: i + 1, title: cleanChapterTitle(e.title), startPage: e.page }));
}

// A table of contents is only trusted if it has at least two real entries.
export async function fetchTocByIsbn(isbns, { fetchImpl = fetch } = {}) {
  for (const isbn of (isbns || []).slice(0, MAX_ISBNS)) {
    try {
      const edition = await getJson(fetchImpl, `https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`);
      const chapters = normalizeToc(edition?.table_of_contents);
      if (chapters.length >= 2) return { chapters, isbn };
    } catch { /* try the next ISBN */ }
  }
  return { chapters: [], isbn: null };
}

export function parseVisionChapters(text) {
  let data;
  try { data = JSON.parse(String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")); } catch { return []; }
  const list = Array.isArray(data) ? data : data?.chapters;
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const e of list) {
    const title = cleanChapterTitle(e?.title);
    if (!title || title.length > 160) continue;
    const page = Number.parseInt(String(e?.page ?? ""), 10);
    const key = norm(title);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ number: out.length + 1, title, startPage: Number.isFinite(page) && page > 0 ? page : null });
    if (out.length >= MAX_CHAPTERS) break;
  }
  return out;
}

export const TOC_VISION_PROMPT =
  "These photos show the contents (table of contents) page(s) of ONE book. Read them together and list the chapters exactly as printed, in order. " +
  "Rules: copy only what is visible; never invent, translate, summarise or guess chapters; skip front matter such as copyright, dedication or acknowledgements; " +
  "if a page number is not visible leave it null; ignore handwriting and unrelated text. " +
  'Return JSON only: {"chapters":[{"title":string,"page":number|null}]}. If no table of contents is readable return {"chapters":[]}.';

export function validateImages(images, { maxCount = 6, maxBytesEach = 1_800_000 } = {}) {
  if (!Array.isArray(images) || !images.length || images.length > maxCount) return null;
  const out = [];
  for (const img of images) {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(img || ""));
    if (!m || Math.floor((m[2].length * 3) / 4) > maxBytesEach) return null;
    out.push({ mimeType: m[1], data: m[2] });
  }
  return out;
}

// Short author blurb from Wikipedia, only when the page clearly describes a writer.
export async function fetchAuthorBio(name, { fetchImpl = fetch } = {}) {
  const who = clean(name).slice(0, 80);
  if (!who) return "";
  try {
    const j = await getJson(fetchImpl, `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(who.replace(/ /g, "_"))}?redirect=true`, { timeoutMs: 6000 });
    const text = clean(j?.extract);
    const hint = `${j?.description || ""} ${text.slice(0, 200)}`;
    if (j?.type !== "standard" || !/author|writer|novelist|poet|essayist|journalist|philosopher|psychologist|engineer|speaker|entrepreneur|scientist|historian|economist/i.test(hint)) return "";
    const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [text];
    return sentences.slice(0, 3).join("").trim().slice(0, 420);
  } catch {
    return "";
  }
}